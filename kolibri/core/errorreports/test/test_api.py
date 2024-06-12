from django.test import TestCase
from django.urls import reverse
from rest_framework.status import HTTP_200_OK
from rest_framework.status import HTTP_400_BAD_REQUEST
from rest_framework.test import APIClient


class FrontendReportTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        self.client = APIClient()

    def test_frontend_report(self):
        url = reverse("kolibri:core:report")
        data = {
            "error_message": "Something went wrong",
            "traceback": "Traceback information",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, HTTP_200_OK)

    def test_frontend_report_invalid_data(self):
        url = reverse("kolibri:core:report")
        data = {
            "error_message": "",
            "traceback": "Traceback information",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)
