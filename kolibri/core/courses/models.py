import hashlib

from django.db import models
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.utils import IntegrityError
from le_utils.constants import modalities
from morango.models import UUIDField

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import AbstractFacilityDataModel
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions.base import RoleBasedPermissions
from kolibri.core.auth.utils.sync import ClassroomPartitionFactory
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import ContentRequestPriority
from kolibri.core.content.utils.assignment import ContentAssignmentManager
from kolibri.core.fields import DateTimeTzField
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.utils.cache import process_cache
from kolibri.utils.data import ChoicesEnum
from kolibri.utils.time_utils import local_now

_COURSE_SESSION_PRIORITY_CACHE_TIMEOUT = 300


def course_assignment_lookup(course_id):
    """
    Lookup function for the ContentAssignmentManager
    :param course_id: a UUID of a course ContentNode
    :return: a tuple of contentnode_id and metadata
    """
    return (course_id, {"import_descendants": True})


def course_content_download_priority(course_session, contentnode_id):
    return course_session.get_course_content_download_priority(contentnode_id)


class TestType(ChoicesEnum):
    Pre = "pre"
    Post = "post"


class UnitPhase(ChoicesEnum):
    PreTestPending = "pre_test_pending"
    PreTestActive = "pre_test_active"
    PostTestPending = "post_test_pending"
    PostTestActive = "post_test_active"
    Complete = "complete"


class CourseSession(AbstractFacilityDataModel):
    # UUID reference to the course ContentNode (not FK due to sync constraints)
    course = UUIDField()

    permissions = RoleBasedPermissions(
        target_field="collection",
        can_be_created_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_updated_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_deleted_by=(role_kinds.ADMIN, role_kinds.COACH),
    )

    # Unlike the Lesson and Exam models, these limits are derived from the ContentNode model, as
    # that will supply the default value for these when the session is created.
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)

    # If True, then the CourseSession should be viewable by Learners
    is_active = models.BooleanField(default=False)

    # The Classroom-type Collection for which the Course is created
    collection = models.ForeignKey(
        Collection,
        related_name="course_sessions",
        blank=False,
        null=False,
        on_delete=models.CASCADE,
    )

    created_by = models.ForeignKey(
        FacilityUser,
        related_name="course_sessions_created",
        blank=True,
        null=True,
        on_delete=models.CASCADE,
    )
    date_created = DateTimeTzField(default=local_now, editable=False)

    # Tracks the channel version at the time of course creation or last channel update
    # This is used so that the course session node is updated when the channel is updated,
    # retriggering content requests if needed.
    channel_version = models.IntegerField(default=0, blank=True, null=True)

    morango_model_name = "coursesession"

    content_assignments = ContentAssignmentManager(
        # This manager will assign just the course ContentNode, further course nodes
        # will be requested later
        one_to_many=False,
        filters=dict(is_active=True),
        lookup_field="course",
        lookup_func=course_assignment_lookup,
        content_download_priority_func=course_content_download_priority,
        channel_version_field="channel_version",
    )

    def __str__(self):
        return "CourseSession {} for Classroom {}".format(
            self.title, self.collection.name
        )

    def get_resume_data(self, user):
        """
        Returns resume state for a given user within this course session.

        :param user: A FacilityUser instance
        :return: dict with keys:
            - started (bool)
            - active_test (dict with unit_id and test_type, or None)
            - resume_position (dict with unit_id, lesson_id, resource_id, or None)
        """
        result = {
            "started": False,
            "active_test": None,
            "resume_position": None,
        }

        unit_test_assignments_qs = self.unit_test_assignments.filter(
            collection__membership__user=user
        )

        unit_test_active = unit_test_assignments_qs.filter(closed=False).first()
        if unit_test_active:
            result["active_test"] = {
                "unit_id": unit_test_active.unit_contentnode_id,
                "test_type": unit_test_active.test_type,
            }
            result["started"] = True
            return result

        most_recent_pre_test_completed = (
            unit_test_assignments_qs.filter(
                closed=True,
                test_type=TestType.Pre,
            )
            .annotate(
                unit_sort_order=Subquery(
                    ContentNode.objects.filter(
                        id=OuterRef("unit_contentnode_id")
                    ).values("lft")[:1]
                ),
            )
            .order_by("-unit_sort_order")
            .first()
        )

        if not most_recent_pre_test_completed:
            return result

        result["started"] = True
        unit_contentnode_id = most_recent_pre_test_completed.unit_contentnode_id

        # No available=True filter. An incomplete resource that is
        # unavailable is the learner's resume position — the frontend's
        # "resource unavailable" state gates forward navigation there.
        # Completed-but-missing resources don't apply: the progress filter
        # below drops them before availability matters.
        first_incomplete_resource = (
            ContentNode.objects.filter(
                parent__parent=unit_contentnode_id,
            )
            .annotate(
                learner_progress=Subquery(
                    ContentSummaryLog.objects.filter(
                        user=user,
                        content_id=OuterRef("content_id"),
                    ).values("progress")[:1]
                ),
            )
            .filter(Q(learner_progress__lt=1) | Q(learner_progress__isnull=True))
            .order_by("lft")
            .first()
        )

        if first_incomplete_resource:
            result["resume_position"] = {
                "unit_id": unit_contentnode_id,
                "lesson_id": first_incomplete_resource.parent_id,
                "resource_id": first_incomplete_resource.id,
            }
        else:
            result["resume_position"] = {
                "unit_id": unit_contentnode_id,
                "lesson_id": None,
                "resource_id": None,
            }

        return result

    def _get_assigned_user(self):
        """
        Empiric way to get a user who is taking the course when we don't have a specific user. Usually for LOD devices there is only one user,
        so this will work fine, but for multi-user devices we just take the first one for simplicity.
        Alternatively, we could check the user activity and see the last user who logged in, or we could also
        try to use all assigned users in the device to set the priority based on everyone.
        In any case, the active unit, and active test will always be the same for all users assigned to the course, so this
        additional effort would be to set critical priority for current resources.
        """
        cache_key = "COURSE_SESSION_ASSIGNED_USER_{}".format(self.pk)
        if cache_key not in process_cache:
            user = FacilityUser.objects.filter(
                memberships__collection__assigned_courses__course_session=self,
            ).first()
            process_cache.set(cache_key, user, _COURSE_SESSION_PRIORITY_CACHE_TIMEOUT)
        else:
            user = process_cache.get(cache_key)
        return user

    def _get_cached_resume_data(self, user):
        cache_key = "COURSE_SESSION_RESUME_DATA_{}_{}".format(self.pk, user.pk)
        if cache_key not in process_cache:
            resume_data = self.get_resume_data(user)
            process_cache.set(
                cache_key, resume_data, _COURSE_SESSION_PRIORITY_CACHE_TIMEOUT
            )
        else:
            resume_data = process_cache.get(cache_key)
        return resume_data

    def _get_cached_unit(self, unit_id):
        cache_key = "COURSE_SESSION_UNIT_{}_{}".format(self.pk, unit_id)
        if cache_key not in process_cache:
            unit = (
                ContentNode.objects.filter(id=unit_id, parent_id=self.course)
                .values("id", "lft", "rght")
                .first()
            )
            process_cache.set(cache_key, unit, _COURSE_SESSION_PRIORITY_CACHE_TIMEOUT)
        else:
            unit = process_cache.get(cache_key)
        return unit

    def _get_active_unit_priority(
        self, contentnode_id, requested_contentnode, resume_position
    ):
        """
        Returns priority for a node that belongs to the currently active unit.
        Checks whether the node is the active lesson, a child of it (URGENT), or elsewhere in the unit (HIGH).
        """
        active_lesson_id = resume_position.get("lesson_id")
        if active_lesson_id:
            if contentnode_id == active_lesson_id:
                return ContentRequestPriority.URGENT
            if (
                requested_contentnode.modality != modalities.LESSON
                and requested_contentnode.parent_id == active_lesson_id
            ):
                return ContentRequestPriority.URGENT
        return ContentRequestPriority.HIGH

    def get_course_content_download_priority(self, contentnode_id):
        """
        Determine the priority for downloading a content node based on the user's progress in the course.

        Priority levels (highest to lowest):
        * CRITICAL: the exact resource currently being resumed, or the active pre/post-test unit node
        * URGENT: the active lesson itself, or any resource that is a direct child of the active lesson
        * HIGH: any other node within the currently active unit (but outside the active lesson)
        * REGULAR: nodes in future (not-yet-reached) units, or when priority cannot be determined
        * LOW: nodes in past (already-completed) units
        """
        requested_contentnode = ContentNode.objects.filter(id=contentnode_id).first()
        if (
            not requested_contentnode
            or requested_contentnode.modality == modalities.COURSE
        ):
            return ContentRequestPriority.REGULAR

        user = self._get_assigned_user()
        if not user:
            return ContentRequestPriority.REGULAR

        resume_data = self._get_cached_resume_data(user)
        if not resume_data or not resume_data.get("started"):
            return ContentRequestPriority.REGULAR

        active_test = resume_data.get("active_test") or {}
        resume_position = resume_data.get("resume_position") or {}

        if (
            resume_position.get("resource_id") == contentnode_id
            or active_test.get("unit_id") == contentnode_id
        ):
            return ContentRequestPriority.CRITICAL

        active_unit_id = active_test.get("unit_id") or resume_position.get("unit_id")
        active_unit = self._get_cached_unit(active_unit_id)
        if not active_unit:
            return ContentRequestPriority.REGULAR

        if (
            requested_contentnode.lft >= active_unit["lft"]
            and requested_contentnode.rght <= active_unit["rght"]
        ):
            # The requested contentnode belongs to the active unit
            return self._get_active_unit_priority(
                contentnode_id, requested_contentnode, resume_position
            )

        if requested_contentnode.lft > active_unit["rght"]:
            # It belongs to a future unit
            return ContentRequestPriority.REGULAR

        # It belongs to a past unit
        return ContentRequestPriority.LOW

    def pre_save(self, **kwargs):
        super().pre_save(**kwargs)
        self.enforce_authoring_user_field("created_by", **kwargs)

    def infer_dataset(self, *args, **kwargs):
        return self.cached_related_dataset_lookup("collection")

    def calculate_partition(self):
        """
        Partition: ${dataset_id}:classroom:${collection_id}:${suffix}
        """
        filter_factory = ClassroomPartitionFactory(self.dataset_id)
        filter_factory.set_coach_writeable()
        classroom_collection = ClassroomPartitionFactory.get_classroom_collection(
            collection=self.collection
        )
        return str(filter_factory.build(classroom_collection.id))

    @classmethod
    def deserialize(cls, dict_model, sync_filter=None):
        if sync_filter is not None and "created_by_id" in dict_model:
            created_by_id = dict_model["created_by_id"]
            dataset_id = dict_model.get("dataset_id")
            if created_by_id and dataset_id:
                user_ro_partition = f"{dataset_id}:user-ro:{created_by_id}"
                user_rw_partition = f"{dataset_id}:user-rw:{created_by_id}"
                super_partition = f"{dataset_id}"

                if (
                    user_ro_partition not in sync_filter
                    and user_rw_partition not in sync_filter
                    and super_partition not in sync_filter
                ):
                    del dict_model["created_by_id"]

        return super().deserialize(dict_model, sync_filter=sync_filter)


class CourseSessionAssignment(AbstractFacilityDataModel):
    """
    Links a course ContentNode to Collections (Classroom or LearnerGroup)
    """

    course_session = models.ForeignKey(
        CourseSession,
        related_name="assignments",
        blank=False,
        null=False,
        on_delete=models.CASCADE,
    )

    # The Collection (Classroom or LearnerGroup) assigned to
    collection = models.ForeignKey(
        Collection,
        related_name="assigned_courses",
        blank=False,
        null=False,
        on_delete=models.CASCADE,
    )

    # Who made the assignment
    assigned_by = models.ForeignKey(
        FacilityUser,
        related_name="assigned_courses",
        blank=True,
        null=True,
        on_delete=models.CASCADE,
    )

    # Permissions (coach/admin can create/read/update/delete)
    permissions = RoleBasedPermissions(
        target_field="collection",
        can_be_created_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_updated_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_deleted_by=(role_kinds.ADMIN, role_kinds.COACH),
    )

    # Morango fields
    morango_model_name = "coursesessionassignment"

    def pre_save(self, **kwargs):
        super().pre_save(**kwargs)

        # this shouldn't happen
        if (
            self.course_session
            and self.collection
            and self.course_session.dataset_id != self.collection.dataset_id
        ):
            raise IntegrityError(
                "CourseSession assignment foreign models must be in same dataset"
            )

        self.enforce_authoring_user_field("assigned_by", **kwargs)

    def infer_dataset(self, *args, **kwargs):
        # infer from course_session so assignments align with course_sessions
        return self.cached_related_dataset_lookup("course_session")

    def calculate_source_id(self):
        return "{course_session_id}:{collection_id}".format(
            course_session_id=self.course_session_id, collection_id=self.collection_id
        )

    def calculate_partition(self):
        """
        Partition: ${dataset_id}:classroom:${collection_id}:${suffix}
        """
        filter_factory = ClassroomPartitionFactory(self.dataset_id)
        filter_factory.set_coach_writeable()
        classroom_collection = ClassroomPartitionFactory.get_classroom_collection(
            collection=self.collection
        )
        return str(filter_factory.build(classroom_collection.id))

    @classmethod
    def deserialize(cls, dict_model, sync_filter=None):
        if sync_filter is not None and "assigned_by_id" in dict_model:
            assigned_by_id = dict_model["assigned_by_id"]
            dataset_id = dict_model.get("dataset_id")
            if assigned_by_id and dataset_id:
                user_ro_partition = f"{dataset_id}:user-ro:{assigned_by_id}"
                user_rw_partition = f"{dataset_id}:user-rw:{assigned_by_id}"
                super_partition = f"{dataset_id}"

                if (
                    user_ro_partition not in sync_filter
                    and user_rw_partition not in sync_filter
                    and super_partition not in sync_filter
                ):
                    del dict_model["assigned_by_id"]

        return super().deserialize(dict_model, sync_filter=sync_filter)


class UnitTestAssignment(AbstractFacilityDataModel):
    """
    Manages the status of pre and post tests within course units.
    Allows coaches to activate and deactivate a quiz within a course session.
    """

    # The course session this test assignment belongs to
    course_session = models.ForeignKey(
        CourseSession,
        related_name="unit_test_assignments",
        blank=False,
        null=False,
        on_delete=models.CASCADE,
    )

    # UUID reference to the Unit ContentNode (not FK due to sync constraints)
    unit_contentnode_id = UUIDField()

    # The Collection (Classroom or LearnerGroup) this test is assigned to
    collection = models.ForeignKey(
        Collection,
        related_name="unit_test_assignments",
        blank=False,
        null=False,
        on_delete=models.CASCADE,
    )

    # Type of test: 'pre' or 'post'
    test_type = models.CharField(
        max_length=10,
        choices=TestType.choices(),
        blank=False,
        null=False,
    )

    # A UnitTestAssignment with closed=False is active
    # closed=True indicates it has been closed
    closed = models.BooleanField(default=False)

    # Which coach activated this test (can be null)
    activated_by = models.ForeignKey(
        FacilityUser,
        related_name="activated_unit_tests",
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
    )

    # Permissions: Coaches/admins can create, read, update, delete
    permissions = RoleBasedPermissions(
        target_field="collection",
        can_be_created_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_read_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_updated_by=(role_kinds.ADMIN, role_kinds.COACH),
        can_be_deleted_by=(role_kinds.ADMIN, role_kinds.COACH),
    )

    # Morango model name for syncing
    morango_model_name = "unittestassignment"

    def __str__(self):
        return (
            "UnitTestAssignment {} ({}) for CourseSession {} in Collection {}".format(
                self.unit_contentnode_id,
                self.test_type,
                self.course_session.title,
                self.collection.name,
            )
        )

    def calculate_source_id(self):
        """
        Generate a unique source ID to prevent duplicate combinations.
        Uses course_session, unit_contentnode_id, collection_id, and test_type.

        Format: {course_session_id}:{md5_hash}
        The MD5 hash is computed from the combination of morango_model_name,
        unit_contentnode_id, collection_id, and test_type to ensure uniqueness
        while staying within the 96-character limit for _morango_source_id.
        """
        key = "{}:{}:{}:{}".format(
            self.morango_model_name,
            self.unit_contentnode_id,
            self.collection_id,
            self.test_type,
        )
        hash_digest = hashlib.md5(key.encode("utf-8")).hexdigest()
        return "{}:{}".format(self.course_session_id, hash_digest)

    def infer_dataset(self, *args, **kwargs):
        """
        Infer dataset from course_session so assignments align with course sessions.
        """
        return self.cached_related_dataset_lookup("course_session")

    def calculate_partition(self):
        """
        Partition by classroom (same as CourseSession model).
        Partition: ${dataset_id}:classroom:${collection_id}:${suffix}
        """
        filter_factory = ClassroomPartitionFactory(self.dataset_id)
        filter_factory.set_coach_writeable()
        classroom_collection = ClassroomPartitionFactory.get_classroom_collection(
            collection=self.collection
        )
        return str(filter_factory.build(classroom_collection.id))

    def pre_save(self, **kwargs):
        super().pre_save(**kwargs)

        # Ensure course_session and collection are in the same dataset
        if (
            self.course_session
            and self.collection
            and self.course_session.dataset_id != self.collection.dataset_id
        ):
            raise IntegrityError(
                "UnitTestAssignment foreign models must be in same dataset"
            )

        # Ensure assignment collection is the same as or a child of the course_session's collection
        if self.course_session and self.collection:
            if (
                self.collection_id != self.course_session.collection_id
                and self.collection.parent_id != self.course_session.collection_id
            ):
                raise IntegrityError(
                    "UnitTestAssignment collection must be the same as or a child of the CourseSession's collection"
                )

        self.enforce_authoring_user_field("activated_by", **kwargs)

    @classmethod
    def deserialize(cls, dict_model, sync_filter=None):
        if sync_filter is not None and "activated_by_id" in dict_model:
            activated_by_id = dict_model["activated_by_id"]
            dataset_id = dict_model.get("dataset_id")
            if activated_by_id and dataset_id:
                user_ro_partition = f"{dataset_id}:user-ro:{activated_by_id}"
                user_rw_partition = f"{dataset_id}:user-rw:{activated_by_id}"
                super_partition = f"{dataset_id}"

                if (
                    user_ro_partition not in sync_filter
                    and user_rw_partition not in sync_filter
                    and super_partition not in sync_filter
                ):
                    del dict_model["activated_by_id"]

        return super().deserialize(dict_model, sync_filter=sync_filter)
