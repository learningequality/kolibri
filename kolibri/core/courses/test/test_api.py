import uuid

from django.urls import reverse
from le_utils.constants import modalities
from rest_framework import status
from rest_framework.test import APITestCase

from .. import models
from kolibri.core.auth.constants import collection_kinds
from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ContentNode

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
        cls.course = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            channel_id=channel_id,
            content_id=uuid.uuid4().hex,
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

    def test_coach_can_activate_pre_test(self):
        """Test that a coach can activate a pre-test"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], self.unit.id)
        self.assertEqual(response.data["test_type"], "pre")
        self.assertEqual(response.data["status"], "active")

        # Verify UnitTestAssignment was created
        assignment = models.UnitTestAssignment.objects.get(
            course_session=self.courseSession,
            unit_contentnode_id=self.unit.id,
            test_type="pre",
        )
        self.assertTrue(assignment.is_active)
        self.assertEqual(assignment.status, "active")
        self.assertEqual(assignment.activated_by, self.coach)

    def test_coach_can_activate_post_test(self):
        """Test that a coach can activate a post-test"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "post",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["test_type"], "post")
        self.assertEqual(response.data["status"], "active")

    def test_admin_can_activate_test(self):
        """Test that an admin can activate a test"""
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_coach_cannot_activate_test(self):
        """Test that a non-coach cannot activate a test"""
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_activate_test_invalid_test_type(self):
        """Test that activating a test with invalid test_type fails"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "invalid",
            },
            format="json",
        )

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

        response = self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": uuid.uuid4().hex,
                "test_type": "pre",
            },
            format="json",
        )

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

        response = self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": other_unit.id,
                "test_type": "pre",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_coach_can_close_active_test(self):
        """Test that a coach can close an active test"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        # First activate a test
        self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )

        # Now close it
        response = self.client.post(
            reverse(
                "kolibri:core:coursesession-close-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], self.unit.id)
        self.assertEqual(response.data["test_type"], "pre")
        self.assertEqual(response.data["status"], "ended")

        # Verify the test is no longer active
        assignment = models.UnitTestAssignment.objects.get(
            course_session=self.courseSession,
            unit_contentnode_id=self.unit.id,
            test_type="pre",
        )
        self.assertFalse(assignment.is_active)
        self.assertEqual(assignment.status, "ended")

    def test_close_test_validation_mismatch_unit(self):
        """Test that closing a test with mismatched unit_contentnode_id fails"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        # Activate a test
        self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )

        # Try to close with different unit_contentnode_id
        response = self.client.post(
            reverse(
                "kolibri:core:coursesession-close-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit2.id,
                "test_type": "pre",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_close_test_validation_mismatch_type(self):
        """Test that closing a test with mismatched test_type fails"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        # Activate a pre-test
        self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )

        # Try to close as post-test
        response = self.client.post(
            reverse(
                "kolibri:core:coursesession-close-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "post",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_close_test_when_no_active_test_returns_404(self):
        """Test that closing when no test is active returns 404"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse(
                "kolibri:core:coursesession-close-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_coach_cannot_close_test(self):
        """Test that a non-coach cannot close a test"""
        # First, coach activates a test
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )

        # learner can not close it
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)
        response = self.client.post(
            reverse(
                "kolibri:core:coursesession-close-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_active_test_returns_test_details(self):
        """Test that active_test endpoint returns full test details"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )

        response = self.client.get(
            reverse(
                "kolibri:core:coursesession-active-test",
                kwargs={"pk": self.courseSession.id},
            ),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("id", response.data)
        self.assertEqual(response.data["unit_contentnode_id"], self.unit.id)
        self.assertEqual(response.data["unit_title"], "Test Unit")
        self.assertEqual(response.data["test_type"], "pre")
        self.assertEqual(response.data["status"], "active")
        self.assertIsNotNone(response.data["activated_by"])
        self.assertEqual(response.data["activated_by"]["username"], "coach")
        self.assertEqual(response.data["activated_by"]["id"], self.coach.id)

    def test_get_active_test_returns_null_when_no_active_test(self):
        """Test that active_test returns null when no test is active"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        response = self.client.get(
            reverse(
                "kolibri:core:coursesession-active-test",
                kwargs={"pk": self.courseSession.id},
            ),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["active_test"])

    def test_non_coach_cannot_get_active_test(self):
        """Test that a non-coach cannot get active test details"""
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)

        response = self.client.get(
            reverse(
                "kolibri:core:coursesession-active-test",
                kwargs={"pk": self.courseSession.id},
            ),
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_activate_test_updates_existing_assignment(self):
        """Test that activating a test updates an existing assignment"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        # Activate a test
        response1 = self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )
        assignment_id_1 = response1.data["id"]

        # Close it
        self.client.post(
            reverse(
                "kolibri:core:coursesession-close-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )

        # Activate it again
        response2 = self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )
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
        """activate_test should return unit_phase and active_unit_index"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_phase"], "pre_test_active")
        self.assertIn("active_unit_index", response.data)

    def test_close_test_returns_unit_phase(self):
        """close_test should return unit_phase and active_unit_index"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

        # First activate a test
        self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )

        # Then close it
        response = self.client.post(
            reverse(
                "kolibri:core:coursesession-close-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_phase"], "post_test_pending")
        self.assertIn("active_unit_index", response.data)

    def test_unauthenticated_user_cannot_activate_test(self):
        """Test that unauthenticated users cannot activate tests"""
        response = self.client.post(
            reverse(
                "kolibri:core:coursesession-activate-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_close_test(self):
        """Test that unauthenticated users cannot close tests"""
        response = self.client.post(
            reverse(
                "kolibri:core:coursesession-close-test",
                kwargs={"pk": self.courseSession.id},
            ),
            {
                "unit_contentnode_id": self.unit.id,
                "test_type": "pre",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_get_active_test(self):
        """Test that unauthenticated users cannot get active test"""
        response = self.client.get(
            reverse(
                "kolibri:core:coursesession-active-test",
                kwargs={"pk": self.courseSession.id},
            ),
        )

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

    def _get_last_unit_test(self):
        """Helper to call the last_unit_test endpoint"""
        return self.client.get(
            reverse(
                "kolibri:core:coursesession-last-unit-test",
                kwargs={"pk": self.courseSession.id},
            ),
        )

    def _create_test(self, unit, test_type, status_val="active"):
        """Helper to create a UnitTestAssignment directly"""
        return models.UnitTestAssignment.objects.create(
            course_session=self.courseSession,
            collection=self.classroom,
            unit_contentnode_id=unit.id,
            test_type=test_type,
            status=status_val,
            is_active=(status_val == "active"),
            activated_by=self.coach,
        )

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
        self.assertIsNone(response.data["status"])
        self.assertIsNone(response.data["activated_by"])
        self.assertEqual(response.data["unit_phase"], "pre_test_pending")
        self.assertEqual(response.data["active_unit_index"], 0)

    # --- Unit 1 progression ---

    def test_returns_unit1_pre_test_when_active(self):
        """Starting point: Unit 1 pre-test is active"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_test(self.unit1, "pre", "active")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit1.id))
        self.assertEqual(response.data["test_type"], "pre")
        self.assertEqual(response.data["status"], "active")

    def test_returns_unit1_pre_test_when_ended(self):
        """Unit 1 pre-test completed, lessons phase"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_test(self.unit1, "pre", "ended")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit1.id))
        self.assertEqual(response.data["test_type"], "pre")
        self.assertEqual(response.data["status"], "ended")

    def test_returns_unit1_post_test_when_active(self):
        """Unit 1 post-test active (pre-test already done)"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_test(self.unit1, "pre", "ended")
        self._create_test(self.unit1, "post", "active")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit1.id))
        self.assertEqual(response.data["test_type"], "post")
        self.assertEqual(response.data["status"], "active")

    def test_returns_unit1_post_test_when_ended(self):
        """Unit 1 complete - both tests ended"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_test(self.unit1, "pre", "ended")
        self._create_test(self.unit1, "post", "ended")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit1.id))
        self.assertEqual(response.data["test_type"], "post")
        self.assertEqual(response.data["status"], "ended")

    # --- Unit 2 progression (unit 1 complete) ---

    def test_returns_unit2_pre_test_when_active(self):
        """Unit 2 pre-test active after unit 1 is complete"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        # Unit 1 complete
        self._create_test(self.unit1, "pre", "ended")
        self._create_test(self.unit1, "post", "ended")
        # Unit 2 starting
        self._create_test(self.unit2, "pre", "active")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit2.id))
        self.assertEqual(response.data["test_type"], "pre")
        self.assertEqual(response.data["status"], "active")

    def test_returns_unit2_pre_test_when_ended(self):
        """Unit 2 pre-test ended, in lessons phase"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        # Unit 1 complete
        self._create_test(self.unit1, "pre", "ended")
        self._create_test(self.unit1, "post", "ended")
        # Unit 2 pre-test done
        self._create_test(self.unit2, "pre", "ended")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit2.id))
        self.assertEqual(response.data["test_type"], "pre")
        self.assertEqual(response.data["status"], "ended")

    def test_returns_unit2_post_test_when_active(self):
        """Unit 2 post-test active"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        # Unit 1 complete
        self._create_test(self.unit1, "pre", "ended")
        self._create_test(self.unit1, "post", "ended")
        # Unit 2 pre done, post active
        self._create_test(self.unit2, "pre", "ended")
        self._create_test(self.unit2, "post", "active")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit2.id))
        self.assertEqual(response.data["test_type"], "post")
        self.assertEqual(response.data["status"], "active")

    def test_returns_unit2_post_test_when_ended(self):
        """Unit 2 complete"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        # Unit 1 complete
        self._create_test(self.unit1, "pre", "ended")
        self._create_test(self.unit1, "post", "ended")
        # Unit 2 complete
        self._create_test(self.unit2, "pre", "ended")
        self._create_test(self.unit2, "post", "ended")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit2.id))
        self.assertEqual(response.data["test_type"], "post")
        self.assertEqual(response.data["status"], "ended")

    # --- Unit 3 progression (units 1 and 2 complete) ---

    def test_returns_unit3_pre_test_when_active(self):
        """Unit 3 pre-test active after units 1 and 2 complete"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        # Units 1 and 2 complete
        self._create_test(self.unit1, "pre", "ended")
        self._create_test(self.unit1, "post", "ended")
        self._create_test(self.unit2, "pre", "ended")
        self._create_test(self.unit2, "post", "ended")
        # Unit 3 starting
        self._create_test(self.unit3, "pre", "active")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit3.id))
        self.assertEqual(response.data["test_type"], "pre")
        self.assertEqual(response.data["status"], "active")

    def test_returns_unit3_pre_test_when_ended(self):
        """Unit 3 pre-test ended, in lessons phase"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        # Units 1 and 2 complete
        self._create_test(self.unit1, "pre", "ended")
        self._create_test(self.unit1, "post", "ended")
        self._create_test(self.unit2, "pre", "ended")
        self._create_test(self.unit2, "post", "ended")
        # Unit 3 pre done
        self._create_test(self.unit3, "pre", "ended")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit3.id))
        self.assertEqual(response.data["test_type"], "pre")
        self.assertEqual(response.data["status"], "ended")

    def test_returns_unit3_post_test_when_active(self):
        """Unit 3 post-test active"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        # Units 1 and 2 complete
        self._create_test(self.unit1, "pre", "ended")
        self._create_test(self.unit1, "post", "ended")
        self._create_test(self.unit2, "pre", "ended")
        self._create_test(self.unit2, "post", "ended")
        # Unit 3 pre done, post active
        self._create_test(self.unit3, "pre", "ended")
        self._create_test(self.unit3, "post", "active")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit3.id))
        self.assertEqual(response.data["test_type"], "post")
        self.assertEqual(response.data["status"], "active")

    def test_returns_unit3_post_test_when_course_complete(self):
        """Course complete - all 3 units finished"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        # All units complete
        self._create_test(self.unit1, "pre", "ended")
        self._create_test(self.unit1, "post", "ended")
        self._create_test(self.unit2, "pre", "ended")
        self._create_test(self.unit2, "post", "ended")
        self._create_test(self.unit3, "pre", "ended")
        self._create_test(self.unit3, "post", "ended")

        response = self._get_last_unit_test()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit3.id))
        self.assertEqual(response.data["test_type"], "post")
        self.assertEqual(response.data["status"], "ended")

    # --- Ordering verification tests ---

    def test_post_takes_precedence_over_pre_within_same_unit(self):
        """Verify that post-test is returned over pre-test for the same unit"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        # Create both tests for unit 1, post should win
        self._create_test(self.unit1, "pre", "ended")
        self._create_test(self.unit1, "post", "ended")

        response = self._get_last_unit_test()

        self.assertEqual(response.data["test_type"], "post")
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit1.id))

    def test_later_unit_takes_precedence_over_earlier_unit(self):
        """Verify that unit 2 pre-test is returned over unit 1 post-test"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        # Unit 1 complete, unit 2 just started
        self._create_test(self.unit1, "pre", "ended")
        self._create_test(self.unit1, "post", "ended")
        self._create_test(self.unit2, "pre", "ended")

        response = self._get_last_unit_test()

        # Unit 2 pre-test should be returned (higher unit position)
        self.assertEqual(response.data["unit_contentnode_id"], str(self.unit2.id))
        self.assertEqual(response.data["test_type"], "pre")

    def test_response_includes_activated_by_info(self):
        """Verify that the response includes activated_by user info"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_test(self.unit1, "pre", "active")

        response = self._get_last_unit_test()

        self.assertIn("activated_by", response.data)
        self.assertEqual(response.data["activated_by"]["id"], self.coach.id)
        self.assertEqual(response.data["activated_by"]["username"], "coach")

    def test_response_structure(self):
        """Verify the response contains all expected fields"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        test = self._create_test(self.unit1, "pre", "active")

        response = self._get_last_unit_test()

        self.assertIn("id", response.data)
        self.assertIn("unit_contentnode_id", response.data)
        self.assertIn("test_type", response.data)
        self.assertIn("status", response.data)
        self.assertIn("activated_by", response.data)
        self.assertEqual(response.data["id"], str(test.id))

    # --- unit_phase and active_unit_index tests ---

    def test_unit_phase_pre_test_active(self):
        """unit_phase should be pre_test_active when a pre-test is running"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_test(self.unit1, "pre", "active")

        response = self._get_last_unit_test()

        self.assertEqual(response.data["unit_phase"], "pre_test_active")
        self.assertEqual(response.data["active_unit_index"], 0)

    def test_unit_phase_post_test_pending(self):
        """unit_phase should be post_test_pending after pre-test ends"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_test(self.unit1, "pre", "ended")

        response = self._get_last_unit_test()

        self.assertEqual(response.data["unit_phase"], "post_test_pending")
        self.assertEqual(response.data["active_unit_index"], 0)

    def test_unit_phase_post_test_active(self):
        """unit_phase should be post_test_active when a post-test is running"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_test(self.unit1, "pre", "ended")
        self._create_test(self.unit1, "post", "active")

        response = self._get_last_unit_test()

        self.assertEqual(response.data["unit_phase"], "post_test_active")
        self.assertEqual(response.data["active_unit_index"], 0)

    def test_unit_phase_pre_test_pending_after_post_test_ends(self):
        """unit_phase should be pre_test_pending for next unit after post-test ends"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_test(self.unit1, "pre", "ended")
        self._create_test(self.unit1, "post", "ended")

        response = self._get_last_unit_test()

        self.assertEqual(response.data["unit_phase"], "pre_test_pending")
        self.assertEqual(response.data["active_unit_index"], 1)

    def test_unit_phase_complete_when_last_unit_post_test_ends(self):
        """unit_phase should be complete when last unit's post-test ends"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_test(self.unit1, "pre", "ended")
        self._create_test(self.unit1, "post", "ended")
        self._create_test(self.unit2, "pre", "ended")
        self._create_test(self.unit2, "post", "ended")
        self._create_test(self.unit3, "pre", "ended")
        self._create_test(self.unit3, "post", "ended")

        response = self._get_last_unit_test()

        self.assertEqual(response.data["unit_phase"], "complete")
        self.assertEqual(response.data["active_unit_index"], -1)

    def test_active_unit_index_mid_course(self):
        """active_unit_index should reflect the current unit position"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_test(self.unit1, "pre", "ended")
        self._create_test(self.unit1, "post", "ended")
        self._create_test(self.unit2, "pre", "active")

        response = self._get_last_unit_test()

        self.assertEqual(response.data["active_unit_index"], 1)
        self.assertEqual(response.data["unit_phase"], "pre_test_active")

    def test_response_structure_includes_new_fields(self):
        """Verify response includes unit_phase and active_unit_index"""
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)
        self._create_test(self.unit1, "pre", "active")

        response = self._get_last_unit_test()

        self.assertIn("unit_phase", response.data)
        self.assertIn("active_unit_index", response.data)
