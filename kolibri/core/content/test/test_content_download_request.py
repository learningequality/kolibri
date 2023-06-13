from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from ..serializers import ContentDownloadRequestSeralizer
from ..serializers import ContentRemovalRequestSeralizer
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import ContentDownloadRequest
from kolibri.core.content.models import ContentRemovalRequest


class ContentDownloadRequestViewsetTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="a")
        cls.user = FacilityUser.objects.create(
            username="learner", password="password", facility=cls.facility
        )

    def setUp(self):
        self.client.force_authenticate(user=self.user)

    def test_create_content_download_request(self):
        self.client.login(username="learner", password="password")
        # Prepare the request data
        request_data = {
            "contentnode_id": "877a1b783fd348bfb87559883e60e9bf",
            "metadata": {
                "title": "Sample Title",
                "file_size": 1024,
                "learning_activities": ["3dSeJhqs"],
            },
        }

        request = self.client.post(reverse("kolibri:core:contentdownloadrequest-list"))
        request.user = self.user

        serializer = ContentDownloadRequestSeralizer(
            data=request_data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        content_download_request = serializer.save()

        self.assertIsNotNone(content_download_request.id)
        self.assertEqual(
            content_download_request.contentnode_id, request_data["contentnode_id"]
        )
        self.assertEqual(
            content_download_request.metadata["title"],
            request_data["metadata"]["title"],
        )
        self.assertEqual(
            content_download_request.metadata["file_size"],
            request_data["metadata"]["file_size"],
        )
        self.assertEqual(
            content_download_request.metadata["learning_activities"],
            request_data["metadata"]["learning_activities"],
        )
        self.assertEqual(content_download_request.source_id, self.user.id)

    def test_user_can_access_own_download_requests(self):
        request_data = {
            "contentnode_id": "877a1b783fd348bfb87559883e60e9bf",
            "metadata": {
                "title": "Sample Title 2",
                "file_size": 1024,
                "learning_activities": ["3dSeJhqs"],
            },
        }

        request = self.client.post(reverse("kolibri:core:contentdownloadrequest-list"))
        request.user = self.user

        serializer = ContentDownloadRequestSeralizer(
            data=request_data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        url = reverse("kolibri:core:contentdownloadrequest-list")
        response = self.client.get(url, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["contentnode_id"], request_data["contentnode_id"]
        )
        self.assertEqual(
            response.data[0]["metadata"]["title"], request_data["metadata"]["title"]
        )

    def test_no_duplicate_creation_requests(self):
        request_data = {
            "contentnode_id": "9dae9116ab3c5c2a8715c0442d9390d3",
            "metadata": {
                "title": "Sample Title",
                "file_size": 1024,
                "learning_activities": ["3dSeJhqs"],
            },
        }

        # Send two identical creation requests
        self.client.post(
            reverse("kolibri:core:contentdownloadrequest-list"),
            request_data,
            format="json",
        )
        response_2 = self.client.post(
            reverse("kolibri:core:contentdownloadrequest-list"),
            request_data,
            format="json",
        )
        self.assertEqual(ContentDownloadRequest.objects.count(), 1)

        contentnode_id = response_2.data["contentnode_id"]
        self.assertEqual(contentnode_id, request_data["contentnode_id"])

    def test_create_content_removal_request(self):
        self.client.login(username="learner", password="password")
        request_data = {
            "contentnode_id": "877a1b783fd348bfb87559883e60e9bf",
        }

        request = self.client.post(reverse("kolibri:core:contentremovalrequest-list"))
        request.user = self.user

        serializer = ContentRemovalRequestSeralizer(
            data=request_data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        content_removal_request = serializer.save()

        self.assertIsNotNone(content_removal_request.id)
        self.assertEqual(
            content_removal_request.contentnode_id, request_data["contentnode_id"]
        )

    def test_no_duplicate_deletion_requests(self):
        self.client.login(username="learner", password="password")

        request_data = {
            "contentnode_id": "9dae9116ab3c5c2a8715c0442d9390d3",
        }

        # Send two identical creation requests
        self.client.post(
            reverse("kolibri:core:contentremovalrequest-list"),
            request_data,
            format="json",
        )
        response_2 = self.client.post(
            reverse("kolibri:core:contentremovalrequest-list"),
            request_data,
            format="json",
        )
        self.assertEqual(ContentRemovalRequest.objects.count(), 1)

        contentnode_id = response_2.data["contentnode_id"]
        self.assertEqual(contentnode_id, request_data["contentnode_id"])

    def test_new_download_request_deletes_corresponding_removal_request(self):
        contentnode_id = "877a1b783fd348bfb87559883e60e9bf"
        # create a removal request first
        request_data = {
            "contentnode_id": contentnode_id,
        }

        request = self.client.post(reverse("kolibri:core:contentremovalrequest-list"))
        request.user = self.user

        serializer = ContentRemovalRequestSeralizer(
            data=request_data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        content_removal_request = serializer.save()

        # then create a download request with the same contentnode_id
        request_data = {
            "contentnode_id": contentnode_id,
            "metadata": {
                "title": "Sample Title",
                "file_size": 1024,
                "learning_activities": ["3dSeJhqs"],
            },
        }
        response = self.client.post(
            reverse("kolibri:core:contentdownloadrequest-list"),
            request_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(
            ContentRemovalRequest.objects.filter(id=content_removal_request.id).exists()
        )
        self.assertTrue(
            ContentDownloadRequest.objects.filter(id=response.data["id"]).exists()
        )
