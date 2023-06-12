from django.urls import reverse
from rest_framework.test import APITestCase

from ..serializers import ContentDownloadRequestSeralizer
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser


class ContentDownloadRequestViewsetTest(APITestCase):
    @classmethod
    def setUp(self):
        self.facility = Facility.objects.create(name="a")
        self.user = FacilityUser.objects.create(
            username="learner", password="password", facility=self.facility
        )

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

        # Create a request with the user context
        request = self.client.post(reverse("kolibri:core:contentdownloadrequest-list"))
        request.user = self.user

        # Serialize and validate the request data
        serializer = ContentDownloadRequestSeralizer(
            data=request_data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        # Create the content download request
        content_download_request = serializer.save()

        # Assertions
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
