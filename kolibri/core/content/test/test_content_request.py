from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from ..serializers import ContentDownloadRequestSeralizer
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import ContentDownloadRequest
from kolibri.core.content.models import ContentRequestStatus


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

        request = self.client.post(reverse("kolibri:core:contentrequest-list"))
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

        request = self.client.post(reverse("kolibri:core:contentrequest-list"))
        request.user = self.user

        serializer = ContentDownloadRequestSeralizer(
            data=request_data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        url = reverse("kolibri:core:contentrequest-list")
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
            reverse("kolibri:core:contentrequest-list"),
            request_data,
            format="json",
        )
        response_2 = self.client.post(
            reverse("kolibri:core:contentrequest-list"),
            request_data,
            format="json",
        )
        self.assertEqual(ContentDownloadRequest.objects.count(), 1)

        contentnode_id = response_2.data["contentnode_id"]
        self.assertEqual(contentnode_id, request_data["contentnode_id"])

    def test_create_content_removal_request(self):
        self.client.force_authenticate(user=self.user)

        # Create a ContentDownloadRequest object
        content_download_request_data = {
            "contentnode_id": "877a1b783fd348bfb87559883e60e9bf",
            "metadata": {
                "title": "Sample Title",
                "file_size": 1024,
                "learning_activities": ["3dSeJhqs"],
            },
        }

        response = self.client.post(
            reverse("kolibri:core:contentrequest-list"),
            data=content_download_request_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        content_download_request_id = response.data["id"]

        # Create a ContentRemovalRequest object for the created ContentDownloadRequest
        response = self.client.delete(
            reverse(
                "kolibri:core:contentrequest-detail",
                kwargs={"pk": content_download_request_id},
            )
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_no_duplicate_deletion_requests(self):
        self.client.force_authenticate(user=self.user)

        # Create a ContentDownloadRequest object
        content_download_request_data = {
            "contentnode_id": "877a1b783fd348bfb87559883e60e9bf",
            "metadata": {
                "title": "Sample Title",
                "file_size": 1024,
                "learning_activities": ["3dSeJhqs"],
            },
        }

        response = self.client.post(
            reverse("kolibri:core:contentrequest-list"),
            data=content_download_request_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        content_download_request_id = response.data["id"]

        # Send two identical deletion requests
        response_1 = self.client.delete(
            reverse(
                "kolibri:core:contentrequest-detail",
                kwargs={"pk": content_download_request_id},
            )
        )
        response_2 = self.client.delete(
            reverse(
                "kolibri:core:contentrequest-detail",
                kwargs={"pk": content_download_request_id},
            )
        )

        self.assertEqual(response_1.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(response_2.status_code, status.HTTP_204_NO_CONTENT)

    def test_new_request_for_failed_content_download_request(self):
        self.client.force_authenticate(user=self.user)

        # Create a ContentDownloadRequest object with status failed
        content_download_request_data = {
            "contentnode_id": "5b3a31a5ddda424f881553debd7ebd98",
            "metadata": {
                "title": "Sample Title",
                "file_size": 1024,
                "learning_activities": ["3dSeJhqs"],
            },
            "status": ContentRequestStatus.Failed,
        }

        response = self.client.post(
            reverse("kolibri:core:contentrequest-list"),
            data=content_download_request_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        content_download_request_id = response.data["id"]

        # Create a ContentRemovalRequest object for the failed ContentDownloadRequest
        response_delete = self.client.delete(
            reverse(
                "kolibri:core:contentrequest-detail",
                kwargs={"pk": content_download_request_id},
            )
        )

        self.assertEqual(response_delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(response.data["status"], ContentRequestStatus.Pending)
