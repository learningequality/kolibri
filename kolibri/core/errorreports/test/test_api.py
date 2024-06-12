from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework.status import HTTP_200_OK
from rest_framework.status import HTTP_400_BAD_REQUEST
from rest_framework.status import HTTP_500_INTERNAL_SERVER_ERROR
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

    @patch(
        "kolibri.core.errorreports.models.ErrorReports.insert_or_update_error",
        side_effect=AttributeError("Mocked AttributeError"),
    )
    def test_frontend_report_server_error_attribute_error(
        self, mock_insert_or_update_error
    ):
        url = reverse("kolibri:core:report")
        data = {
            "error_message": "Something went wrong",
            "traceback": "Traceback information",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("error", response.data)

    @patch(
        "kolibri.core.errorreports.models.ErrorReports.insert_or_update_error",
        side_effect=Exception("Mocked exception"),
    )
    def test_frontend_report_server_error(self, mock_insert_or_update_error):
        url = reverse("kolibri:core:report")
        data = {
            "error_message": "Something went wrong",
            "traceback": "Traceback information",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("error", response.data)
