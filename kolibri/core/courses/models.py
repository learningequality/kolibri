from django.db import models
from django.db.models import Q
from django.db.utils import IntegrityError
from morango.models import UUIDField

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import AbstractFacilityDataModel
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.permissions.base import RoleBasedPermissions
from kolibri.core.auth.utils.sync import ClassroomPartitionFactory
from kolibri.core.device.utils import get_device_setting
from kolibri.core.fields import DateTimeTzField
from kolibri.utils.time_utils import local_now


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

    morango_model_name = "coursesession"

    def __str__(self):
        return "CourseSession {} for Classroom {}".format(
            self.title, self.collection.name
        )

    def pre_save(self):
        super().pre_save()
        # if the created_by user is in a different dataset than the dataset we've determined, then
        # we'll unset it to prevent deserialization errors when syncing
        if self.created_by and self.created_by.dataset_id != self.dataset_id:
            if not self.created_by.is_superuser:
                raise IntegrityError(
                    "CourseSession must have creator in the same dataset"
                )
            self.created_by = None

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
    def deserialize(cls, dict_model):
        """
        Temporary hack to prevent deserialization of created_by_id

        A proper implementation should leverage the new sync_filter in the enhancement of
        https://github.com/learningequality/morango/issues/281
        """
        # this needs to check both for the setup wizard, and another reason why this is better
        # handled with logic based off the sync_filter
        if get_device_setting("subset_of_users_device") or not get_device_setting(
            "is_provisioned"
        ):
            del dict_model["created_by_id"]
        return super().deserialize(dict_model)


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

    def pre_save(self):
        super().pre_save()

        # this shouldn't happen
        if (
            self.course_session
            and self.collection
            and self.course_session.dataset_id != self.collection.dataset_id
        ):
            raise IntegrityError(
                "CourseSession assignment foreign models must be in same dataset"
            )

        # maintain stricter enforcement on when assigned_by is allowed to be null
        # assignments aren't usually updated, but ensure only during creation
        if self._state.adding and self.assigned_by is None:
            raise IntegrityError(
                "CourseSession assignment must be saved with an assigner"
            )

        # validate that datasets match so this would be syncable
        if self.assigned_by and self.assigned_by.dataset_id != self.dataset_id:
            # the only time assigned_by can be null is if it's a superuser
            # and if we set it to none HERE
            if not self.assigned_by.is_superuser:
                raise IntegrityError(
                    "CourseSession assignment must have assigner in the same dataset"
                )
            self.assigned_by = None

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
    def deserialize(cls, dict_model):
        """
        Temporary hack to prevent deserialization of assigned_by_id

        A proper implementation should leverage the new sync_filter in the enhancement of
        https://github.com/learningequality/morango/issues/281
        """
        if get_device_setting("subset_of_users_device") or not get_device_setting(
            "is_provisioned"
        ):
            del dict_model["assigned_by_id"]
        return super().deserialize(dict_model)


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
        choices=[
            ("pre", "Pre-test"),
            ("post", "Post-test"),
        ],
        blank=False,
        null=False,
    )

    # Whether this test is currently active
    # Only one test can be active per course session at a time
    is_active = models.BooleanField(default=False)

    # Which coach activated this test (can be null)
    activated_by = models.ForeignKey(
        FacilityUser,
        related_name="activated_unit_tests",
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
    )

    # Current status of the test
    status = models.CharField(
        max_length=20,
        choices=[
            ("not_started", "Not Started"),
            ("active", "Active"),
            ("ended", "Ended"),
        ],
        default="not_started",
        blank=False,
        null=False,
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
        """
        return "{course_session_id}:{unit_contentnode_id}:{collection_id}:{test_type}".format(
            course_session_id=self.course_session_id,
            unit_contentnode_id=self.unit_contentnode_id,
            collection_id=self.collection_id,
            test_type=self.test_type,
        )

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

    def pre_save(self):
        super().pre_save()

        # Ensure course_session and collection are in the same dataset
        if (
            self.course_session
            and self.collection
            and self.course_session.dataset_id != self.collection.dataset_id
        ):
            raise IntegrityError(
                "UnitTestAssignment foreign models must be in same dataset"
            )

        # If activated_by is set, validate it's in the same dataset
        if self.activated_by and self.activated_by.dataset_id != self.dataset_id:
            # Only allow null for superusers
            if not self.activated_by.is_superuser:
                raise IntegrityError(
                    "UnitTestAssignment activated_by must be in the same dataset"
                )
            self.activated_by = None

    class Meta:
        unique_together = (
            ("course_session", "unit_contentnode_id", "collection", "test_type"),
        )
        constraints = [
            models.UniqueConstraint(
                fields=["course_session"],
                condition=Q(is_active=True),
                name="unittestassignment_one_active_per_session",
            )
        ]

    @classmethod
    def deserialize(cls, dict_model):
        """
        For now lets implement a temporary hack to prevent deserialization of activated_by_id

        A proper implementation should leverage the new sync_filter in the enhancement of
        https://github.com/learningequality/morango/issues/281
        """
        if get_device_setting("subset_of_users_device") or not get_device_setting(
            "is_provisioned"
        ):
            del dict_model["activated_by_id"]
        return super().deserialize(dict_model)
