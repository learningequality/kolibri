import uuid

from django.urls import reverse
from django.utils import timezone
from le_utils.constants import content_kinds
from le_utils.constants import modalities
from rest_framework import status

from kolibri.core.auth.constants import collection_kinds
from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.test.helpers import KolibriAPITestCase as APITestCase
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.utils.pre_post_test import get_synthetic_content_id

from .. import models
from ..models import TestType
from ..models import UnitPhase
from ..models import UnitTestAssignment

DUMMY_PASSWORD = "password"


class CourseSessionAPITestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="MyFac")
        cls.admin = FacilityUser.objects.create(username="admin", facility=cls.facility)
        cls.admin.set_password(DUMMY_PASSWORD)
        cls.admin.save()
        cls.facility.add_admin(cls.admin)
        cls.classroom = Classroom.objects.create(name="Classroom", parent=cls.facility)
        cls.coach = FacilityUser.objects.create(username="coach", facility=cls.facility)
        cls.coach.set_password(DUMMY_PASSWORD)
        cls.coach.save()
        cls.classroom.add_coach(cls.coach)

        channel_id = uuid.uuid4().hex
        cls.root_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            available=True,
            title="Channel Root",
        )
        cls.channel = ChannelMetadata.objects.create(
            id=channel_id,
            name="Test Channel",
            version=7,
            root=cls.root_node,
            min_schema_version="1",
        )
        cls.course = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=cls.root_node,
            available=True,
            modality=modalities.COURSE,
            title="Course 1",
            description="A course",
        )

        cls.courseSession = models.CourseSession.objects.create(
            is_active=True,
            collection=cls.classroom,
            created_by=cls.admin,
            course=cls.course.id,
            title=cls.course.title,
            description=cls.course.description,
        )

        cls.courseSession_2 = models.CourseSession.objects.create(
            is_active=True,
            collection=cls.classroom,
            created_by=cls.admin,
            course=cls.course.id,
            title=cls.course.title,
            description=cls.course.description,
        )

    def test_logged_in_user_course_session_no_delete(self):
        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.delete(
            reverse(
                "kolibri:core:coursesession-detail",
                kwargs={"pk": self.courseSession_2.id},
            )
        )
        self.assertEqual(response.status_code, 403)

    def test_logged_in_admin_course_session_delete(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.delete(
            reverse(
                "kolibri:core:coursesession-detail",
                kwargs={"pk": self.courseSession_2.id},
            )
        )
        self.assertEqual(response.status_code, 204)

    def test_logged_in_admin_course_session_create(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:coursesession-list"),
            {
                "active": True,
                "collection": self.classroom.id,
                "course": self.course.id,
            },
            format="json",
        )
        created_by = response.data.get("created_by")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(created_by, self.admin.id)

    def test_logged_in_admin_course_session_create_with_assignments(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:coursesession-list"),
            {
                "active": True,
                "collection": self.classroom.id,
                "course": self.course.id,
                "assignments": [self.classroom.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        course_session_id = response.data["id"]
        self.assertTrue(
            models.CourseSession.objects.get(id=course_session_id)
            .assignments.filter(collection=self.classroom)
            .exists()
        )

    def test_logged_in_admin_course_session_update_no_assignments(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:coursesession-list"),
            {
                "active": True,
                "collection": self.classroom.id,
                "course": self.course.id,
                "assignments": [self.classroom.id],
            },
            format="json",
        )
        course_session_id = response.data["id"]
        response = self.client.patch(
            reverse(
                "kolibri:core:coursesession-detail", kwargs={"pk": course_session_id}
            ),
            {
                "assignments": [],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            models.CourseSession.objects.get(id=course_session_id).assignments.count(),
            0,
        )

    def test_logged_in_admin_course_session_update_different_assignments(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:coursesession-list"),
            {
                "active": True,
                "collection": self.classroom.id,
                "course": self.course.id,
                "assignments": [self.classroom.id],
            },
            format="json",
        )
        course_session_id = response.data["id"]
        group = LearnerGroup.objects.create(name="test", parent=self.classroom)
        response = self.client.patch(
            reverse(
                "kolibri:core:coursesession-detail", kwargs={"pk": course_session_id}
            ),
            {
                "assignments": [group.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            models.CourseSession.objects.get(id=course_session_id).assignments.count(),
            1,
        )
        self.assertEqual(
            models.CourseSession.objects.get(id=course_session_id)
            .assignments.first()
            .collection,
            group,
        )

    def test_logged_in_admin_course_session_update_additional_assignments(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:coursesession-list"),
            {
                "active": True,
                "collection": self.classroom.id,
                "course": self.course.id,
                "assignments": [self.classroom.id],
            },
            format="json",
        )
        course_session_id = response.data["id"]
        group = LearnerGroup.objects.create(name="test", parent=self.classroom)
        response = self.client.patch(
            reverse(
                "kolibri:core:coursesession-detail", kwargs={"pk": course_session_id}
            ),
            {
                "assignments": [group.id, self.classroom.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            models.CourseSession.objects.get(id=course_session_id).assignments.count(),
            2,
        )
        self.assertIn(
            models.CourseSession.objects.get(id=course_session_id)
            .assignments.first()
            .collection,
            [group, self.classroom],
        )
        self.assertIn(
            models.CourseSession.objects.get(id=course_session_id)
            .assignments.last()
            .collection,
            [group, self.classroom],
        )

    def test_logged_in_admin_course_session_create_learner_assignments(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        user = FacilityUser.objects.create(username="u", facility=self.facility)
        user_2 = FacilityUser.objects.create(username="u", facility=self.facility)

        self.classroom.add_member(user)
        self.classroom.add_member(user_2)

        response = self.client.post(
            reverse("kolibri:core:coursesession-list"),
            {
                "active": True,
                "collection": self.classroom.id,
                "course": self.course.id,
                "learner_ids": [user.id, user_2.id],
            },
            format="json",
        )
        course_session_id = response.data["id"]

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            models.CourseSession.objects.get(id=course_session_id).assignments.count(),
            1,
        )
        adhoc_group = (
            models.CourseSession.objects.get(id=course_session_id)
            .assignments.first()
            .collection
        )
        self.assertEqual(len(adhoc_group.get_members()), 2)
        self.assertIn(user, adhoc_group.get_members())
        self.assertIn(user_2, adhoc_group.get_members())
        # Confirm it is an AdHocGroup
        self.assertEqual(adhoc_group.kind, collection_kinds.ADHOCLEARNERSGROUP)

    def test_logged_in_admin_course_session_update_learner_assignments(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:coursesession-list"),
            {
                "active": True,
                "collection": self.classroom.id,
                "course": self.course.id,
                "assignments": [self.classroom.id],
            },
            format="json",
        )
        course_session_id = response.data["id"]

        user = FacilityUser.objects.create(username="u", facility=self.facility)
        user_2 = FacilityUser.objects.create(username="u", facility=self.facility)

        self.classroom.add_member(user)
        self.classroom.add_member(user_2)

        response = self.client.patch(
            reverse(
                "kolibri:core:coursesession-detail", kwargs={"pk": course_session_id}
            ),
            {
                "assignments": [],
                "learner_ids": [user.id, user_2.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            models.CourseSession.objects.get(id=course_session_id).assignments.count(),
            1,
        )
        adhoc_group = (
            models.CourseSession.objects.get(id=course_session_id)
            .assignments.first()
            .collection
        )
        self.assertEqual(len(adhoc_group.get_members()), 2)
        self.assertIn(user, adhoc_group.get_members())
        self.assertIn(user_2, adhoc_group.get_members())
        # Confirm it is an AdHocGroup
        self.assertEqual(adhoc_group.kind, collection_kinds.ADHOCLEARNERSGROUP)

    def test_logged_in_admin_course_session_update_learner_assignments_wrong_collection(
        self,
    ):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:coursesession-list"),
            {
                "active": True,
                "collection": self.classroom.id,
                "course": self.course.id,
                "assignments": [self.classroom.id],
            },
            format="json",
        )
        course_session_id = response.data["id"]

        # User who is not in the classroom
        user = FacilityUser.objects.create(username="u", facility=self.facility)

        response = self.client.patch(
            reverse(
                "kolibri:core:coursesession-detail", kwargs={"pk": course_session_id}
            ),
            {
                "active": True,
                "collection": self.classroom.id,
                "course": self.course.id,
                "assignments": [],
                "created_by": self.admin.id,
                "learner_ids": [user.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        with self.assertRaises(AdHocGroup.DoesNotExist):
            AdHocGroup.objects.get(parent=self.classroom)

    def test_logged_in_user_course_session_no_create(self):
        # user without admin nor coach rights
        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.post(
            reverse("kolibri:core:coursesession-list"),
            {
                "active": True,
                "collection": self.classroom.id,
                "course": self.course.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_logged_in_admin_course_session_update_basic(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.put(
            reverse(
                "kolibri:core:coursesession-detail",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "active": True,
                "collection": self.classroom.id,
                "course": self.course.id,
                "assignments": [],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)

    def test_logged_in_user_course_session_no_update(self):
        # user without admin nor coach rights
        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.put(
            reverse(
                "kolibri:core:coursesession-detail",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "id": self.courseSession.id,
                "active": True,
                "collection": self.classroom.id,
                "course": self.course.id,
                "assignments": [],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_can_get_course_session_list(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.get(
            reverse("kolibri:core:coursesession-list"),
            {
                "collection": self.classroom.id,
            },
        )

        self.assertEqual(response.status_code, 200)
        # There are two course sessions created in setUpTestData
        self.assertEqual(len(response.data), 2)
        self.assertIn(
            self.courseSession.id,
            [course_session["id"] for course_session in response.data],
        )
        self.assertIn(
            self.courseSession_2.id,
            [course_session["id"] for course_session in response.data],
        )

    def test_coach_can_see_only_allowed_course_sessions(self):
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        response = self.client.get(reverse("kolibri:core:coursesession-list"))

        self.assertEqual(response.status_code, 200)
        # This coach can see course sessions from the classroom where they are coach
        self.assertEqual(
            len(response.data), 2
        )  # Both course sessions from their classroom
        course_session_ids = [cs["id"] for cs in response.data]
        self.assertIn(self.courseSession.id, course_session_ids)
        self.assertIn(self.courseSession_2.id, course_session_ids)

    def test_cannot_create_course_session_with_non_existent_course_id(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:coursesession-list"),
            {
                "active": True,
                "collection": self.classroom.id,
                "course": "non_existent_course_id",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_cannot_create_course_session_with_non_course_modality(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        # Create a content node that is not a COURSE
        video_content = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=self.course.channel_id,
            content_id=uuid.uuid4().hex,
            available=True,
            modality=None,  # Not a COURSE
            title="Video Content",
            description="A video",
        )

        response = self.client.post(
            reverse("kolibri:core:coursesession-list"),
            {
                "active": True,
                "collection": self.classroom.id,
                "course": video_content.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_coach_can_only_see_own_classroom_course_sessions(self):
        # Create another classroom and course session
        other_classroom = Classroom.objects.create(
            name="Other Classroom", parent=self.facility
        )
        other_coach = FacilityUser.objects.create(
            username="other_coach", facility=self.facility
        )
        other_coach.set_password(DUMMY_PASSWORD)
        other_coach.save()
        other_classroom.add_coach(other_coach)

        other_course_session = models.CourseSession.objects.create(
            is_active=True,
            collection=other_classroom,
            created_by=self.admin,
            course=self.course.id,
            title="Other Course Session",
            description="Course session in other classroom",
        )

        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        response = self.client.get(reverse("kolibri:core:coursesession-list"))

        self.assertEqual(response.status_code, 200)
        # Coach should only see course sessions from their own classroom
        course_session_ids = [cs["id"] for cs in response.data]
        self.assertIn(self.courseSession.id, course_session_ids)
        self.assertIn(self.courseSession_2.id, course_session_ids)
        self.assertNotIn(other_course_session.id, course_session_ids)

    def test_coach_can_create_course_session(self):
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:coursesession-list"),
            {
                "active": True,
                "collection": self.classroom.id,
                "course": self.course.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)

    def test_learner_cannot_create_course_session(self):
        learner = FacilityUser.objects.create(
            username="learner", facility=self.facility
        )
        learner.set_password(DUMMY_PASSWORD)
        learner.save()
        self.classroom.add_member(learner)

        self.client.login(username=learner.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:coursesession-list"),
            {
                "active": True,
                "collection": self.classroom.id,
                "course": self.course.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_can_update_course_session_active(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.patch(
            reverse(
                "kolibri:core:coursesession-detail",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "active": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.courseSession.refresh_from_db()
        self.assertFalse(self.courseSession.is_active)

    def test_unauthenticated_user_cannot_create_course_session(self):
        """Test that unauthenticated users get an error when trying to create a course session"""
        response = self.client.post(
            reverse("kolibri:core:coursesession-list"),
            {
                "active": True,
                "collection": self.classroom.id,
                "course": self.course.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_update_course_session(self):
        """Test that unauthenticated users get an error when trying to update a course session"""
        response = self.client.patch(
            reverse(
                "kolibri:core:coursesession-detail",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "active": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_delete_course_session(self):
        """Test that unauthenticated users get an error when trying to delete a course session"""
        response = self.client.delete(
            reverse(
                "kolibri:core:coursesession-detail",
                kwargs={"pk": self.courseSession.id},
            )
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_course_session_sets_channel_version(self):
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        response = self.client.post(
            reverse("kolibri:core:coursesession-list"),
            {
                "active": True,
                "collection": self.classroom.id,
                "course": self.course.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        session = models.CourseSession.objects.get(id=response.data["id"])
        self.assertEqual(session.channel_version, 7)

    def test_create_course_session_without_channel_sets_null(self):
        orphan_channel_id = uuid.uuid4().hex
        orphan_root = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=orphan_channel_id,
            content_id=uuid.uuid4().hex,
            available=True,
            title="Orphan Root",
        )
        orphan_course = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=orphan_channel_id,
            content_id=uuid.uuid4().hex,
            parent=orphan_root,
            available=True,
            title="Orphan Course",
            modality=modalities.COURSE,
        )
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        response = self.client.post(
            reverse("kolibri:core:coursesession-list"),
            {
                "active": True,
                "collection": self.classroom.id,
                "course": orphan_course.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        session = models.CourseSession.objects.get(id=response.data["id"])
        self.assertIsNone(session.channel_version)

    def _create_and_fetch_session(self, payload):
        create_resp = self.client.post(
            reverse("kolibri:core:coursesession-list"),
            payload,
            format="json",
        )
        self.assertEqual(create_resp.status_code, 201)
        course_session_id = create_resp.data["id"]
        response = self.client.get(
            reverse(
                "kolibri:core:coursesession-detail", kwargs={"pk": course_session_id}
            ),
        )
        self.assertEqual(response.status_code, 200)
        return response.data

    def test_course_session_list_response_shape(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        # Create a session with an assignment so assignments list is non-empty
        cs = self._create_and_fetch_session(
            {
                "active": True,
                "collection": self.classroom.id,
                "course": self.course.id,
                "assignments": [self.classroom.id],
            }
        )

        # All top-level fields must be present
        for field in (
            "id",
            "title",
            "description",
            "course",
            "active",
            "collection",
            "classroom",
            "created_by",
            "date_created",
            "assignments",
            "missing_resource",
            "learner_ids",
        ):
            self.assertIn(field, cs, msg=f"Missing field: {field}")

        # 'is_active' must not appear — should be renamed to 'active'
        self.assertNotIn("is_active", cs)

        # classroom must be a dict with exactly id, name, parent
        classroom = cs["classroom"]
        self.assertIsInstance(classroom, dict)
        self.assertEqual(classroom["id"], self.classroom.id)
        self.assertEqual(classroom["name"], "Classroom")
        self.assertEqual(classroom["parent"], self.facility.id)

        # active must reflect True (we created with active=True)
        self.assertTrue(cs["active"])

        # assignments must contain the classroom id
        self.assertIn(self.classroom.id, cs["assignments"])

        # missing_resource must be False (self.course has available=True)
        self.assertFalse(cs["missing_resource"])

        # learner_ids must be a list
        self.assertIsInstance(cs["learner_ids"], list)

    def test_missing_resource_true_when_course_unavailable(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        unavailable_course = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=self.course.channel_id,
            content_id=uuid.uuid4().hex,
            parent=self.root_node,
            available=False,
            modality=modalities.COURSE,
            title="Unavailable Course",
            description="A course",
        )
        cs = self._create_and_fetch_session(
            {
                "active": True,
                "collection": self.classroom.id,
                "course": unavailable_course.id,
            }
        )
        self.assertTrue(cs["missing_resource"])

    def test_learner_ids_populated_in_response(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        learner_a = FacilityUser.objects.create(
            username="learner_shape_a", facility=self.facility
        )
        learner_b = FacilityUser.objects.create(
            username="learner_shape_b", facility=self.facility
        )
        self.classroom.add_member(learner_a)
        self.classroom.add_member(learner_b)

        cs = self._create_and_fetch_session(
            {
                "active": True,
                "collection": self.classroom.id,
                "course": self.course.id,
                "learner_ids": [learner_a.id, learner_b.id],
            }
        )
        self.assertIn(learner_a.id, cs["learner_ids"])
        self.assertIn(learner_b.id, cs["learner_ids"])
        # The ad-hoc group must NOT appear in assignments (consolidate() strips it)
        self.assertEqual(cs["assignments"], [])


class CourseSessionProgressAPITestCase(APITestCase):
    """Tests for unit_phase, active_unit_number, active_unit_title, test_learner_progress."""

    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="ProgressFac")
        cls.admin = FacilityUser.objects.create(
            username="progressadmin", facility=cls.facility
        )
        cls.admin.set_password(DUMMY_PASSWORD)
        cls.admin.save()
        cls.facility.add_admin(cls.admin)

        cls.learner1 = cls._create_learner("learner1")
        cls.learner2 = cls._create_learner("learner2")

        cls.classroom = Classroom.objects.create(
            name="ProgressClass", parent=cls.facility
        )
        cls.classroom.add_member(cls.learner1)
        cls.classroom.add_member(cls.learner2)

        channel_id = uuid.uuid4().hex
        cls.root_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            available=True,
            title="Channel Root",
        )
        cls.channel = ChannelMetadata.objects.create(
            id=channel_id,
            name="Progress Test Channel",
            version=1,
            root=cls.root_node,
            min_schema_version="1",
        )
        cls.course = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=cls.root_node,
            available=True,
            modality=modalities.COURSE,
            title="Test Course",
        )
        cls.unit = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent=cls.course,
            available=True,
            modality=modalities.UNIT,
            title="Unit One",
        )
        # Rebuild MPTT tree so lft/rght/level values are consistent
        ContentNode.objects.rebuild()

        cls.course_session = models.CourseSession.objects.create(
            is_active=True,
            collection=cls.classroom,
            created_by=cls.admin,
            course=cls.course.id,
            title=cls.course.title,
        )
        # Assign the classroom as a recipient
        models.CourseSessionAssignment.objects.create(
            course_session=cls.course_session,
            collection=cls.classroom,
            assigned_by=cls.admin,
        )

    def setUp(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

    @classmethod
    def _create_learner(cls, username):
        user = FacilityUser.objects.create(username=username, facility=cls.facility)
        user.set_password(DUMMY_PASSWORD)
        user.save()
        return user

    def _create_test_assignment(self, test_type, closed):
        return UnitTestAssignment.objects.create(
            course_session=self.course_session,
            unit_contentnode_id=self.unit.id,
            collection=self.classroom,
            test_type=test_type,
            activated_by=self.admin,
            closed=closed,
        )

    def _make_learner_log(self, user, content_id, complete):
        sl = ContentSummaryLog.objects.create(
            user=user,
            content_id=content_id,
            channel_id=None,
            kind=content_kinds.QUIZ,
            start_timestamp=timezone.now(),
        )
        MasteryLog.objects.create(
            user=user,
            summarylog=sl,
            complete=complete,
            mastery_level=-1,
            start_timestamp=timezone.now(),
        )

    def _get_session_data(self):
        """Return the first (and only) item from the list endpoint."""
        resp = self.client.get(
            reverse("kolibri:core:coursesession-list"),
            {"collection": self.classroom.id},
        )
        self.assertEqual(resp.status_code, 200)
        items = [i for i in resp.data if str(i["id"]) == str(self.course_session.id)]
        self.assertEqual(len(items), 1)
        return items[0]

    def test_no_test_returns_pre_test_pending_and_null_progress(self):
        data = self._get_session_data()
        self.assertEqual(data["unit_phase"], UnitPhase.PreTestPending)
        self.assertIsNone(data["test_learner_progress"])
        self.assertIsNotNone(data["active_unit_number"])
        self.assertEqual(data["active_unit_number"], 1)
        self.assertEqual(data["active_unit_title"], self.unit.title)

    def test_pre_test_active_returns_correct_progress(self):
        self._create_test_assignment(TestType.Pre, closed=False)
        synthetic_cid = get_synthetic_content_id(
            str(self.course_session.id), str(self.unit.id), TestType.Pre
        )
        self._make_learner_log(self.learner1, synthetic_cid, True)
        self._make_learner_log(self.learner2, synthetic_cid, False)

        data = self._get_session_data()
        self.assertEqual(data["unit_phase"], UnitPhase.PreTestActive)
        self.assertEqual(data["active_unit_number"], 1)
        progress = data["test_learner_progress"]
        self.assertIsNotNone(progress)
        self.assertEqual(progress["completed"], 1)
        self.assertEqual(progress["started"], 1)
        self.assertEqual(progress["notStarted"], 0)
        self.assertEqual(progress["total"], 2)

    def test_post_test_active_returns_correct_progress(self):
        self._create_test_assignment(TestType.Pre, closed=True)
        self._create_test_assignment(TestType.Post, closed=False)
        synthetic_cid = get_synthetic_content_id(
            str(self.course_session.id), str(self.unit.id), TestType.Post
        )
        self._make_learner_log(self.learner1, synthetic_cid, True)

        data = self._get_session_data()
        self.assertEqual(data["unit_phase"], UnitPhase.PostTestActive)
        progress = data["test_learner_progress"]
        self.assertIsNotNone(progress)
        self.assertEqual(progress["completed"], 1)
        self.assertEqual(progress["started"], 0)
        self.assertEqual(progress["notStarted"], 1)
        self.assertEqual(progress["total"], 2)

    def test_complete_phase_returns_post_test_progress(self):
        self._create_test_assignment(TestType.Pre, closed=True)
        self._create_test_assignment(TestType.Post, closed=True)
        synthetic_cid = get_synthetic_content_id(
            str(self.course_session.id), str(self.unit.id), TestType.Post
        )
        self._make_learner_log(self.learner1, synthetic_cid, True)
        self._make_learner_log(self.learner2, synthetic_cid, True)

        data = self._get_session_data()
        self.assertEqual(data["unit_phase"], UnitPhase.Complete)
        self.assertIsNone(data["active_unit_number"])
        progress = data["test_learner_progress"]
        self.assertIsNotNone(progress)
        self.assertEqual(progress["completed"], 2)
        self.assertEqual(progress["started"], 0)
        self.assertEqual(progress["notStarted"], 0)
        self.assertEqual(progress["total"], 2)

    def test_post_test_pending_returns_correct_phase_and_progress(self):
        # Pre-test closed, post-test not yet activated: PostTestPending
        self._create_test_assignment(TestType.Pre, closed=True)
        synthetic_cid = get_synthetic_content_id(
            str(self.course_session.id), str(self.unit.id), TestType.Pre
        )
        self._make_learner_log(self.learner1, synthetic_cid, True)
        self._make_learner_log(self.learner2, synthetic_cid, False)

        data = self._get_session_data()
        self.assertEqual(data["unit_phase"], UnitPhase.PostTestPending)
        self.assertEqual(data["active_unit_number"], 1)
        # Progress reflects the closed pre-test (last test for the unit)
        progress = data["test_learner_progress"]
        self.assertIsNotNone(progress)
        self.assertEqual(progress["completed"], 1)
        self.assertEqual(progress["started"], 1)
        self.assertEqual(progress["notStarted"], 0)
        self.assertEqual(progress["total"], 2)

    def test_duplicate_mastery_log_complete_wins(self):
        # A learner with both complete=True and complete=False MasteryLog rows for
        # the same ContentSummaryLog should be counted as completed (dedup rule).
        self._create_test_assignment(TestType.Pre, closed=False)
        synthetic_cid = get_synthetic_content_id(
            str(self.course_session.id), str(self.unit.id), TestType.Pre
        )
        # learner1: one ContentSummaryLog, two MasteryLog rows (incomplete then complete)
        sl = ContentSummaryLog.objects.create(
            user=self.learner1,
            content_id=synthetic_cid,
            channel_id=None,
            kind=content_kinds.QUIZ,
            start_timestamp=timezone.now(),
        )
        MasteryLog.objects.create(
            user=self.learner1,
            summarylog=sl,
            complete=False,
            mastery_level=-1,
            start_timestamp=timezone.now(),
        )
        MasteryLog.objects.create(
            user=self.learner1,
            summarylog=sl,
            complete=True,
            mastery_level=-2,
            start_timestamp=timezone.now(),
        )
        # learner2: not started
        data = self._get_session_data()
        progress = data["test_learner_progress"]
        self.assertIsNotNone(progress)
        self.assertEqual(progress["completed"], 1)
        self.assertEqual(progress["started"], 0)
        self.assertEqual(progress["notStarted"], 1)
        self.assertEqual(progress["total"], 2)

    def test_deleted_group_member_excluded_from_total(self):
        # A learner who is a classroom member but has date_deleted set must not
        # inflate total/notStarted — _fetch_group_memberships filters on
        # FacilityUser.get_is_active_q().
        deleted_learner = FacilityUser.objects.create(
            username="deletedlearner", facility=self.facility
        )
        self.classroom.add_member(deleted_learner)
        # Soft-delete via update() to leave the Membership row intact so the
        # filter in _fetch_group_memberships is what excludes the user.
        FacilityUser.objects.filter(pk=deleted_learner.pk).update(
            date_deleted=timezone.now()
        )

        self._create_test_assignment(TestType.Pre, closed=False)

        data = self._get_session_data()
        progress = data["test_learner_progress"]
        self.assertIsNotNone(progress)
        # Only learner1 and learner2 are active; deleted_learner must not count.
        self.assertEqual(progress["total"], 2)
        self.assertEqual(progress["notStarted"], 2)


""""
DISCLAIMER:  Some parts of these tests were written with an AI assistance.
 I have reviewed and validated the generated tests
Example of prompts I used:
- "Look at my tests and suggest improvements and why I am getting AssertionError: 403 != 400" in
kolibri/core/courses/test/test_api.py:805:"
- "Create tests for UnitTestAssignment activation and closing"
- "Create tests for UnitTestAssignment validation"
"""


class UnitTestActivationAPITestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="TestFacility")
        cls.admin = FacilityUser.objects.create(username="admin", facility=cls.facility)
        cls.admin.set_password(DUMMY_PASSWORD)
        cls.admin.save()
        cls.facility.add_admin(cls.admin)

        cls.classroom = Classroom.objects.create(name="Classroom", parent=cls.facility)
        cls.coach = FacilityUser.objects.create(username="coach", facility=cls.facility)
        cls.coach.set_password(DUMMY_PASSWORD)
        cls.coach.save()
        cls.classroom.add_coach(cls.coach)

        cls.learner = FacilityUser.objects.create(
            username="learner", facility=cls.facility
        )
        cls.learner.set_password(DUMMY_PASSWORD)
        cls.learner.save()
        cls.classroom.add_member(cls.learner)

        # Create a course ContentNode
        channel_id = uuid.uuid4().hex
        cls.course = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            available=True,
            modality=modalities.COURSE,
            title="Test Course",
            description="A test course",
        )

        # Create a unit ContentNode (child of course)
        cls.unit = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent_id=cls.course.id,
            available=True,
            modality=modalities.UNIT,
            title="Test Unit",
            description="A test unit",
        )

        # Create another unit for additional tests
        cls.unit2 = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent_id=cls.course.id,
            available=True,
            modality=modalities.UNIT,
            title="Test Unit 2",
            description="Another test unit",
        )

        cls.courseSession = models.CourseSession.objects.create(
            is_active=True,
            collection=cls.classroom,
            created_by=cls.admin,
            course=cls.course.id,
            title=cls.course.title,
            description=cls.course.description,
        )

    def _activate_test(self, unit_id, test_type, **kwargs):
        return self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {"unit_contentnode_id": unit_id, "test_type": test_type, **kwargs},
            format="json",
        )

    def _close_test(self, unit_id, test_type):
        return self.client.post(
            reverse(
                "kolibri:core:coursesession-close-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {"unit_contentnode_id": unit_id, "test_type": test_type},
            format="json",
        )

    def _get_active_test(self):
        return self.client.get(
            reverse(
                "kolibri:core:coursesession-active-test",
                kwargs={"pk": self.courseSession.id},
            ),
        )

    def test_coach_can_activate_pre_test(self):
        """Test that a coach can activate a pre-test"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        response = self._activate_test(self.unit.id, "pre")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], self.unit.id)
        self.assertEqual(response.data["test_type"], "pre")
        self.assertEqual(response.data["closed"], False)

        # Verify UnitTestAssignment was created
        assignment = models.UnitTestAssignment.objects.get(
            course_session=self.courseSession,
            unit_contentnode_id=self.unit.id,
            test_type="pre",
        )
        self.assertFalse(assignment.closed)
        self.assertEqual(assignment.activated_by, self.coach)

    def test_coach_can_activate_post_test(self):
        """Test that a coach can activate a post-test"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        response = self._activate_test(self.unit.id, "post")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["test_type"], "post")
        self.assertEqual(response.data["closed"], False)

    def test_admin_can_activate_test(self):
        """Test that an admin can activate a test"""
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self._activate_test(self.unit.id, "pre")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_coach_cannot_activate_test(self):
        """Test that a non-coach cannot activate a test"""
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)

        response = self._activate_test(self.unit.id, "pre")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_activate_test_invalid_test_type(self):
        """Test that activating a test with invalid test_type fails"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        response = self._activate_test(self.unit.id, "invalid")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activate_test_missing_unit_contentnode_id(self):
        """Test that activating a test without unit_contentnode_id fails"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "test_type": "pre",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activate_test_missing_test_type(self):
        """Test that activating a test without test_type fails"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activate_test_nonexistent_unit(self):
        """Test that activating a test with non-existent unit fails"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        response = self._activate_test(uuid.uuid4().hex, "pre")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activate_test_unit_not_in_course(self):
        """Test that activating a test for a unit not in the course fails"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        # Create a unit that's not part of this course
        other_unit = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            available=True,
            modality=modalities.UNIT,
            title="Other Unit",
        )

        response = self._activate_test(other_unit.id, "pre")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_coach_can_close_active_test(self):
        """Test that a coach can close an active test"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        # First activate a test
        self._activate_test(self.unit.id, "pre")

        # Now close it
        response = self._close_test(self.unit.id, "pre")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], self.unit.id)
        self.assertEqual(response.data["test_type"], "pre")
        self.assertEqual(response.data["closed"], True)

        # Verify the test is no longer active
        assignment = models.UnitTestAssignment.objects.get(
            course_session=self.courseSession,
            unit_contentnode_id=self.unit.id,
            test_type="pre",
        )
        self.assertTrue(assignment.closed)

    def test_close_test_validation_mismatch_unit(self):
        """Test that closing a test with mismatched unit_contentnode_id fails"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        # Activate a test
        self._activate_test(self.unit.id, "pre")

        # Try to close with different unit_contentnode_id
        response = self._close_test(self.unit2.id, "pre")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_close_test_validation_mismatch_type(self):
        """Test that closing a test with mismatched test_type fails"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        # Activate a pre-test
        self._activate_test(self.unit.id, "pre")

        # Try to close as post-test
        response = self._close_test(self.unit.id, "post")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_close_test_when_no_active_test_returns_404(self):
        """Test that closing when no test is active returns 404"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        response = self._close_test(self.unit.id, "pre")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_coach_cannot_close_test(self):
        """Test that a non-coach cannot close a test"""
        # First, coach activates a test
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._activate_test(self.unit.id, "pre")

        # learner can not close it
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)
        response = self._close_test(self.unit.id, "pre")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_active_test_returns_test_details(self):
        """Test that active_test endpoint returns full test details"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        self._activate_test(self.unit.id, "pre")

        response = self._get_active_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("id", response.data)
        self.assertEqual(response.data["unit_contentnode_id"], self.unit.id)
        self.assertEqual(response.data["unit_title"], "Test Unit")
        self.assertEqual(response.data["test_type"], "pre")
        self.assertEqual(response.data["closed"], False)
        self.assertIsNotNone(response.data["activated_by"])
        self.assertEqual(response.data["activated_by"]["username"], "coach")
        self.assertEqual(response.data["activated_by"]["id"], self.coach.id)

    def test_get_active_test_returns_null_when_no_active_test(self):
        """Test that active_test returns null when no test is active"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        response = self._get_active_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["active_test"])

    def test_non_coach_cannot_get_active_test(self):
        """Test that a non-coach cannot get active test details"""
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)

        response = self._get_active_test()

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_activate_test_updates_existing_assignment(self):
        """Test that activating a test updates an existing assignment"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        # Activate a test
        response1 = self._activate_test(self.unit.id, "pre")
        assignment_id_1 = response1.data["id"]

        # Close it
        self._close_test(self.unit.id, "pre")

        # Activate it again
        response2 = self._activate_test(self.unit.id, "pre")
        assignment_id_2 = response2.data["id"]

        # Should be the same assignment updated
        self.assertEqual(assignment_id_1, assignment_id_2)

        # Verify only one assignment exists
        self.assertEqual(
            models.UnitTestAssignment.objects.filter(
                course_session=self.courseSession,
                unit_contentnode_id=self.unit.id,
                test_type="pre",
            ).count(),
            1,
        )

    def test_activate_test_returns_unit_phase(self):
        """activate_test should return unit_phase and active_unit_id"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        response = self._activate_test(self.unit.id, "pre")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_phase"], "pre_test_active")
        self.assertIn("active_unit_id", response.data)

    def test_close_test_returns_unit_phase(self):
        """close_test should return unit_phase and active_unit_id"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        # First activate a test
        self._activate_test(self.unit.id, "pre")

        # Then close it
        response = self._close_test(self.unit.id, "pre")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_phase"], "post_test_pending")
        self.assertIn("active_unit_id", response.data)

    def test_unauthenticated_user_cannot_activate_test(self):
        """Test that unauthenticated users cannot activate tests"""
        response = self._activate_test(self.unit.id, "pre")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_close_test(self):
        """Test that unauthenticated users cannot close tests"""
        response = self._close_test(self.unit.id, "pre")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_get_active_test(self):
        """Test that unauthenticated users cannot get active test"""
        response = self._get_active_test()

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class LastUnitTestAPITestCase(APITestCase):
    """
    Tests for the last_unit_test endpoint which returns the most recent test
    based on unit ordering and test type (post > pre within each unit).

    For a course with 3 units, the ordering priority (highest to lowest) is:
    unit3.post > unit3.pre > unit2.post > unit2.pre > unit1.post > unit1.pre
    """

    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="TestFacility")
        cls.admin = FacilityUser.objects.create(username="admin", facility=cls.facility)
        cls.admin.set_password(DUMMY_PASSWORD)
        cls.admin.save()
        cls.facility.add_admin(cls.admin)

        cls.classroom = Classroom.objects.create(name="Classroom", parent=cls.facility)
        cls.coach = FacilityUser.objects.create(username="coach", facility=cls.facility)
        cls.coach.set_password(DUMMY_PASSWORD)
        cls.coach.save()
        cls.classroom.add_coach(cls.coach)

        cls.learner = FacilityUser.objects.create(
            username="learner", facility=cls.facility
        )
        cls.learner.set_password(DUMMY_PASSWORD)
        cls.learner.save()
        cls.classroom.add_member(cls.learner)

        # Create a course ContentNode
        channel_id = uuid.uuid4().hex
        cls.course = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            available=True,
            modality=modalities.COURSE,
            title="Test Course",
            description="A test course with 3 units",
        )

        # Create 3 units (children of course) - order matters for lft/rght tree
        cls.unit1 = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent_id=cls.course.id,
            available=True,
            modality=modalities.UNIT,
            title="Unit 1: Introduction",
            description="First unit",
        )

        cls.unit2 = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent_id=cls.course.id,
            available=True,
            modality=modalities.UNIT,
            title="Unit 2: Fundamentals",
            description="Second unit",
        )

        cls.unit3 = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            parent_id=cls.course.id,
            available=True,
            modality=modalities.UNIT,
            title="Unit 3: Advanced",
            description="Third unit",
        )

        cls.courseSession = models.CourseSession.objects.create(
            is_active=True,
            collection=cls.classroom,
            created_by=cls.admin,
            course=cls.course.id,
            title=cls.course.title,
            description=cls.course.description,
        )

        # Course with no units for edge case testing
        cls.empty_course = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
            available=True,
            modality=modalities.COURSE,
            title="Empty Course",
            description="A course with no units",
        )

        cls.empty_course_session = models.CourseSession.objects.create(
            is_active=True,
            collection=cls.classroom,
            created_by=cls.admin,
            course=cls.empty_course.id,
            title=cls.empty_course.title,
            description=cls.empty_course.description,
        )

    def setUp(self):
        # Clean up any UnitTestAssignments between tests
        models.UnitTestAssignment.objects.filter(
            course_session=self.courseSession
        ).delete()

    def _close_test(self, unit_id, test_type):
        return self.client.post(
            reverse(
                "kolibri:core:coursesession-close-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {"unit_contentnode_id": unit_id, "test_type": test_type},
            format="json",
        )

    def _get_last_unit_test(self):
        """Helper to call the last_unit_test endpoint"""
        return self.client.get(
            reverse(
                "kolibri:core:coursesession-last-unit-test",
                kwargs={"pk": self.courseSession.id},
            ),
        )

    def _create_test(self, unit, test_type, closed):
        """Helper to create a UnitTestAssignment directly"""
        return models.UnitTestAssignment.objects.create(
            course_session=self.courseSession,
            collection=self.classroom,
            unit_contentnode_id=unit.id,
            test_type=test_type,
            closed=closed,
            activated_by=self.coach,
        )

    def _create_tests_to(self, unit, test_type):
        """Create all UnitTestAssignments up to and including the given step.

        All steps before the target are created with closed=True; the target step
        is created with closed=False.  Returns the last created assignment.

        e.g. _create_tests_to(self.unit2, "post") creates:
        unit1/pre=closed, unit1/post=closed, unit2/pre=closed, unit2/post=active
        """
        steps = [
            (self.unit1, "pre"),
            (self.unit1, "post"),
            (self.unit2, "pre"),
            (self.unit2, "post"),
            (self.unit3, "pre"),
            (self.unit3, "post"),
        ]
        for step_unit, step_type in steps:
            closed = not (step_unit == unit and step_type == test_type)
            result = self._create_test(step_unit, step_type, closed)
            if not closed:
                return result
        return None

    # --- Permission tests ---

    def test_coach_can_get_last_unit_test(self):
        """Test that a coach can access the last_unit_test endpoint"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        response = self._get_last_unit_test()
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_get_last_unit_test(self):
        """Test that an admin can access the last_unit_test endpoint"""
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self._get_last_unit_test()
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_learner_cannot_get_last_unit_test(self):
        """Test that a learner cannot access the last_unit_test endpoint"""
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)
        response = self._get_last_unit_test()
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_user_cannot_get_last_unit_test(self):
        """Test that unauthenticated users cannot access the endpoint"""
        response = self._get_last_unit_test()
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- Edge cases ---

    def test_returns_initial_state_when_no_tests_taken(self):
        """Test that endpoint returns initial course state when no tests have been taken"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["id"])
        self.assertIsNone(response.data["unit_contentnode_id"])
        self.assertIsNone(response.data["test_type"])
        self.assertIsNone(response.data["activated_by"])
        self.assertEqual(response.data["unit_phase"], "pre_test_pending")
        self.assertEqual(response.data["active_unit_id"], str(self.unit1.id))

    # --- Unit 1 progression ---

    def test_returns_unit1_pre_test_when_active(self):
        """Starting point: Unit 1 pre-test is active"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit1, "pre")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit1.id))
        self.assertEqual(response.data["test_type"], "pre")
        self.assertEqual(response.data["closed"], False)

    def test_returns_unit1_pre_test_when_ended(self):
        """Unit 1 pre-test completed, lessons phase"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit1, "pre")
        self._close_test(self.unit1.id, "pre")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit1.id))
        self.assertEqual(response.data["test_type"], "pre")
        self.assertEqual(response.data["closed"], True)

    def test_returns_unit1_post_test_when_active(self):
        """Unit 1 post-test active (pre-test already done)"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit1, "post")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit1.id))
        self.assertEqual(response.data["test_type"], "post")
        self.assertEqual(response.data["closed"], False)

    def test_returns_unit1_post_test_when_ended(self):
        """Unit 1 complete - both tests ended"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit1, "post")
        self._close_test(self.unit1.id, "post")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit1.id))
        self.assertEqual(response.data["test_type"], "post")
        self.assertEqual(response.data["closed"], True)

    # --- Unit 2 progression (unit 1 complete) ---

    def test_returns_unit2_pre_test_when_active(self):
        """Unit 2 pre-test active after unit 1 is complete"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit2, "pre")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit2.id))
        self.assertEqual(response.data["test_type"], "pre")
        self.assertEqual(response.data["closed"], False)

    def test_returns_unit2_pre_test_when_ended(self):
        """Unit 2 pre-test ended, in lessons phase"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit2, "pre")
        self._close_test(self.unit2.id, "pre")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit2.id))
        self.assertEqual(response.data["test_type"], "pre")
        self.assertEqual(response.data["closed"], True)

    def test_returns_unit2_post_test_when_active(self):
        """Unit 2 post-test active"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit2, "post")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit2.id))
        self.assertEqual(response.data["test_type"], "post")
        self.assertEqual(response.data["closed"], False)

    def test_returns_unit2_post_test_when_ended(self):
        """Unit 2 complete"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit2, "post")
        self._close_test(self.unit2.id, "post")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit2.id))
        self.assertEqual(response.data["test_type"], "post")
        self.assertEqual(response.data["closed"], True)

    # --- Unit 3 progression (units 1 and 2 complete) ---

    def test_returns_unit3_pre_test_when_active(self):
        """Unit 3 pre-test active after units 1 and 2 complete"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit3, "pre")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit3.id))
        self.assertEqual(response.data["test_type"], "pre")
        self.assertEqual(response.data["closed"], False)

    def test_returns_unit3_pre_test_when_ended(self):
        """Unit 3 pre-test ended, in lessons phase"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit3, "pre")
        self._close_test(self.unit3.id, "pre")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit3.id))
        self.assertEqual(response.data["test_type"], "pre")
        self.assertEqual(response.data["closed"], True)

    def test_returns_unit3_post_test_when_active(self):
        """Unit 3 post-test active"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit3, "post")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit3.id))
        self.assertEqual(response.data["test_type"], "post")
        self.assertEqual(response.data["closed"], False)

    def test_returns_unit3_post_test_when_course_complete(self):
        """Course complete - all 3 units finished"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit3, "post")
        self._close_test(self.unit3.id, "post")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit3.id))
        self.assertEqual(response.data["test_type"], "post")
        self.assertEqual(response.data["closed"], True)

    # --- Ordering verification tests ---

    def test_post_takes_precedence_over_pre_within_same_unit(self):
        """Verify that post-test is returned over pre-test for the same unit"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit1, "post")
        self._close_test(self.unit1.id, "post")

        response = self._get_last_unit_test()

        self.assertEqual(response.data["test_type"], "post")
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit1.id))

    def test_later_unit_takes_precedence_over_earlier_unit(self):
        """Verify that unit 2 pre-test is returned over unit 1 post-test"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit2, "pre")
        self._close_test(self.unit2.id, "pre")

        response = self._get_last_unit_test()

        # Unit 2 pre-test should be returned (higher unit position)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit2.id))
        self.assertEqual(response.data["test_type"], "pre")

    def test_response_includes_activated_by_info(self):
        """Verify that the response includes activated_by user info"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit1, "pre")

        response = self._get_last_unit_test()

        self.assertIn("activated_by", response.data)
        self.assertEqual(response.data["activated_by"]["id"], self.coach.id)
        self.assertEqual(response.data["activated_by"]["username"], "coach")

    def test_response_structure(self):
        """Verify the response contains all expected fields"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        test = self._create_tests_to(self.unit1, "pre")

        response = self._get_last_unit_test()

        self.assertIn("id", response.data)
        self.assertIn("unit_contentnode_id", response.data)
        self.assertIn("test_type", response.data)
        self.assertIn("closed", response.data)
        self.assertIn("activated_by", response.data)
        self.assertEqual(response.data["id"], str(test.id))

    # --- unit_phase and active_unit_index tests ---

    def test_unit_phase_pre_test_active(self):
        """unit_phase should be pre_test_active when a pre-test is running"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit1, "pre")

        response = self._get_last_unit_test()

        self.assertEqual(response.data["unit_phase"], "pre_test_active")
        self.assertEqual(response.data["active_unit_id"], str(self.unit1.id))

    def test_unit_phase_post_test_pending(self):
        """unit_phase should be post_test_pending after pre-test ends"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit1, "pre")
        self._close_test(self.unit1.id, "pre")

        response = self._get_last_unit_test()

        self.assertEqual(response.data["unit_phase"], "post_test_pending")
        self.assertEqual(response.data["active_unit_id"], str(self.unit1.id))

    def test_unit_phase_post_test_active(self):
        """unit_phase should be post_test_active when a post-test is running"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit1, "post")

        response = self._get_last_unit_test()

        self.assertEqual(response.data["unit_phase"], "post_test_active")
        self.assertEqual(response.data["active_unit_id"], str(self.unit1.id))

    def test_unit_phase_pre_test_pending_after_post_test_ends(self):
        """unit_phase should be pre_test_pending for next unit after post-test ends"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit1, "post")
        self._close_test(self.unit1.id, "post")

        response = self._get_last_unit_test()

        self.assertEqual(response.data["unit_phase"], "pre_test_pending")
        self.assertEqual(response.data["active_unit_id"], str(self.unit2.id))

    def test_unit_phase_complete_when_last_unit_post_test_ends(self):
        """unit_phase should be complete when last unit's post-test ends"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit3, "post")
        self._close_test(self.unit3.id, "post")

        response = self._get_last_unit_test()

        self.assertEqual(response.data["unit_phase"], "complete")
        self.assertIsNone(response.data["active_unit_id"])

    def test_active_unit_index_mid_course(self):
        """active_unit_index should reflect the current unit position"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit2, "pre")

        response = self._get_last_unit_test()

        self.assertEqual(response.data["active_unit_id"], str(self.unit2.id))
        self.assertEqual(response.data["unit_phase"], "pre_test_active")

    def test_response_structure_includes_new_fields(self):
        """Verify response includes unit_phase and active_unit_index"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_tests_to(self.unit1, "pre")

        response = self._get_last_unit_test()

        self.assertIn("unit_phase", response.data)
        self.assertIn("active_unit_id", response.data)
