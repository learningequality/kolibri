from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .. import models
from kolibri.core import error_constants
from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile


DUMMY_PASSWORD = "password"


class LessonAPITestCase(APITestCase):
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
        cls.lesson = models.Lesson.objects.create(
            title="title",
            is_active=True,
            collection=cls.classroom,
            created_by=cls.admin,
        )
        cls.lesson2 = models.Lesson.objects.create(
            title="title2",
            is_active=True,
            collection=cls.classroom,
            created_by=cls.admin,
        )

    def test_logged_in_user_lesson_no_delete(self):

        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.delete(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": self.lesson.id})
        )
        self.assertEqual(response.status_code, 403)

    def test_logged_in_admin_lesson_delete(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.delete(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": self.lesson.id})
        )
        self.assertEqual(response.status_code, 204)

    def test_logged_in_admin_lesson_create(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": "title next",
                "active": True,
                "collection": self.classroom.id,
                "assignments": [],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)

    def test_logged_in_admin_lesson_create_with_assignments(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": "title next",
                "active": True,
                "collection": self.classroom.id,
                "assignments": [self.classroom.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            models.LessonAssignment.objects.get(collection=self.classroom).lesson,
            models.Lesson.objects.get(title="title next"),
        )

    def test_logged_in_admin_lesson_update_no_assignments(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": "title next",
                "active": True,
                "collection": self.classroom.id,
                "assignments": [self.classroom.id],
            },
            format="json",
        )
        lesson_id = models.Lesson.objects.get(title="title next").id
        response = self.client.put(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": lesson_id}),
            {
                "title": "title next",
                "active": True,
                "collection": self.classroom.id,
                "assignments": [],
                "created_by": self.admin.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            models.Lesson.objects.get(title="title next").lesson_assignments.count(), 0
        )

    def test_logged_in_admin_lesson_update_different_assignments(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": "title next",
                "active": True,
                "collection": self.classroom.id,
                "assignments": [self.classroom.id],
            },
            format="json",
        )
        lesson_id = models.Lesson.objects.get(title="title next").id
        group = LearnerGroup.objects.create(name="test", parent=self.classroom)
        response = self.client.put(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": lesson_id}),
            {
                "title": "title next",
                "active": True,
                "collection": self.classroom.id,
                "assignments": [group.id],
                "created_by": self.admin.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            models.Lesson.objects.get(title="title next").lesson_assignments.count(), 1
        )
        self.assertEqual(
            models.Lesson.objects.get(title="title next")
            .lesson_assignments.first()
            .collection,
            group,
        )

    def test_logged_in_admin_lesson_update_additional_assignments(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": "title next",
                "active": True,
                "collection": self.classroom.id,
                "assignments": [self.classroom.id],
            },
            format="json",
        )
        lesson_id = models.Lesson.objects.get(title="title next").id
        group = LearnerGroup.objects.create(name="test", parent=self.classroom)
        response = self.client.put(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": lesson_id}),
            {
                "title": "title next",
                "active": True,
                "collection": self.classroom.id,
                "assignments": [group.id, self.classroom.id],
                "created_by": self.admin.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            models.Lesson.objects.get(title="title next").lesson_assignments.count(), 2
        )
        self.assertIn(
            models.Lesson.objects.get(title="title next")
            .lesson_assignments.first()
            .collection,
            [group, self.classroom],
        )
        self.assertIn(
            models.Lesson.objects.get(title="title next")
            .lesson_assignments.last()
            .collection,
            [group, self.classroom],
        )

    def test_logged_in_admin_lesson_update_learner_assignments(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": "title next",
                "active": True,
                "collection": self.classroom.id,
                "assignments": [self.classroom.id],
            },
            format="json",
        )

        user = FacilityUser.objects.create(username="u", facility=self.facility)

        self.classroom.add_member(user)
        lesson_id = models.Lesson.objects.get(title="title next").id
        response = self.client.put(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": lesson_id}),
            {
                "title": "title next",
                "active": True,
                "collection": self.classroom.id,
                "assignments": [],
                "created_by": self.admin.id,
                "learner_ids": [user.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            models.Lesson.objects.get(title="title next").lesson_assignments.count(), 1
        )
        adhoc_group = AdHocGroup.objects.get(parent=self.classroom)
        self.assertEqual(len(adhoc_group.get_members()), 1)
        self.assertEqual(adhoc_group.get_members()[0], user)
        self.assertEqual(
            models.LessonAssignment.objects.get(collection=adhoc_group),
            models.Lesson.objects.get(title="title next").lesson_assignments.first(),
        )

    def test_logged_in_admin_lesson_update_learner_assignments_wrong_collection(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": "title next",
                "active": True,
                "collection": self.classroom.id,
                "assignments": [self.classroom.id],
            },
            format="json",
        )

        user = FacilityUser.objects.create(username="u", facility=self.facility)

        lesson_id = models.Lesson.objects.get(title="title next").id
        response = self.client.put(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": lesson_id}),
            {
                "title": "title next",
                "active": True,
                "collection": self.classroom.id,
                "assignments": [],
                "created_by": self.admin.id,
                "learner_ids": [user.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        with self.assertRaises(AdHocGroup.DoesNotExist):
            AdHocGroup.objects.get(parent=self.classroom)

    def test_logged_in_user_lesson_no_create(self):

        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": "title next",
                "active": True,
                "collection": self.classroom.id,
                "assignments": [],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_logged_in_admin_lesson_update(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.put(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": self.lesson.id}),
            {
                "title": "title",
                "active": True,
                "collection": self.classroom.id,
                "assignments": [],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)

    def test_logged_in_user_lesson_no_update(self):

        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.put(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": self.lesson.id}),
            {
                "id": self.lesson.id,
                "title": "title",
                "active": True,
                "collection": self.classroom.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_cannot_create_lesson_same_title_case_insensitive(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": "TiTlE",
                "active": True,
                "collection": self.classroom.id,
                "assignments": [self.classroom.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0]["id"], error_constants.UNIQUE)

    def test_can_update_lesson_same_title(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.patch(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": self.lesson.id}),
            {
                "id": self.lesson.id,
                "title": "title",
                "active": False,
                "collection": self.classroom.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_can_update_lesson_multiple_same_title(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        models.Lesson.objects.create(
            title="title",
            is_active=True,
            collection=self.classroom,
            created_by=self.admin,
        )

        response = self.client.patch(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": self.lesson.id}),
            {
                "id": self.lesson.id,
                "title": "title",
                "active": False,
                "collection": self.classroom.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_can_update_lesson_to_same_title_as_other_lesson(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        models.Lesson.objects.create(
            title="titular",
            is_active=True,
            collection=self.classroom,
            created_by=self.admin,
        )

        response = self.client.patch(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": self.lesson.id}),
            {
                "id": self.lesson.id,
                "title": "titular",
                "active": True,
                "collection": self.classroom.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0]["id"], error_constants.UNIQUE)

    def test_cannot_create_lesson_same_title_as_multiple_lessons(self):
        # Make a second copy of the lesson so that we now have two with the same title
        models.Lesson.objects.create(
            title="title",
            is_active=True,
            collection=self.classroom,
            created_by=self.admin,
        )
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": self.lesson.title,
                "active": True,
                "collection": self.classroom.id,
                "assignments": [self.classroom.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0]["id"], error_constants.UNIQUE)

    def test_can_get_lesson_size(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        content_root = ContentNode.objects.create(
            id="579ddae52c2349d32ca6e655840dc2c0",
            channel_id="6436067f6f8f7c2eb15a296c887c788d",
            parent_id=None,
            content_id="ae5b5a53580aace508b6545486662d93",
            title="root2",
            description="ordinary root",
            kind="topic",
            author="",
            license_name="WTFPL",
            license_description=None,
            license_owner="",
            lang_id=None,
            available=False,
            tree_id=2,
            level=0,
            lft=1,
            rght=2,
            sort_order=None,
        )
        channel = ChannelMetadata.objects.create(
            id=content_root.channel_id,
            name="testing 2",
            description="more test data",
            author="buster",
            last_updated=None,
            min_schema_version="1",
            thumbnail="",
            root_id=content_root.id,
            version=0,
        )
        video_content = ContentNode.objects.create(
            id="f0dcb2c7e365a9c480042e2af93b0411",
            channel_id=channel.id,
            parent_id=content_root.id,
            content_id="c3e0d6073a31fd8b8d138b926d7b8567",
            title="alt video",
            description="ordinary video",
            kind="video",
            author="",
            license_name="WTFPL",
            license_description=None,
            license_owner="",
            lang_id=None,
            available=False,
            tree_id=2,
            level=1,
            lft=2,
            rght=1,
            sort_order=None,
        )
        local_video = LocalFile.objects.create(
            id="c3e0d6073a31fd8b8d138b926d7b8567",
            file_size=1000,
            available=False,
            extension="mp4",
        )
        File.objects.create(
            id="c3e0d6073a31fd8b8d138b926d7b8567",
            local_file_id=local_video.id,
            preset="high_res_video",
            thumbnail=False,
            priority=None,
            contentnode_id=video_content.id,
            supplementary=False,
            lang_id=None,
        )

        self.lesson.resources.append(video_content)

        response = self.client.get(
            reverse("kolibri:core:lesson-size"),
            {
                "collection": self.classroom.id,
            },
        )

        self.assertEqual(response.status_code, 200)  # passing!

    def test_can_update_lesson_active(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.patch(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": self.lesson.id}),
            {
                "active": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.lesson.refresh_from_db()
        self.assertFalse(self.lesson.is_active)
