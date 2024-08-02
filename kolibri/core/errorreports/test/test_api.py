from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework.status import HTTP_200_OK
from rest_framework.status import HTTP_400_BAD_REQUEST
from rest_framework.test import APIClient


class FrontendReportTestCase(TestCase):
    databases = "__all__"
    data = {
        "error_message": "Something went wrong",
        "traceback": "Traceback information",
        "context": {
            "browser": {
                "name": "Chrome",
                "major": "1",
                "minor": "2",
                "patch": "3",
            },
            "os": {
                "name": "OS",
                "major": "1",
                "minor": "2",
                "patch": "3",
            },
            "component": "component",
            "device": {
                "model": "",
                "type": "type",
                "vendor": "vendor",
                "is_touch_device": True,
                "screen": {
                    "width": 100,
                    "height": 200,
                    "available_width": 100,
                    "available_height": 200,
                },
            },
        },
    }

    def setUp(self):
        self.client = APIClient()

    def test_frontend_report(self):
        url = reverse("kolibri:core:report")
        response = self.client.post(url, self.data, format="json")
        self.assertEqual(response.status_code, HTTP_200_OK)

    def test_frontend_report_invalid_data(self):
        url = reverse("kolibri:core:report")
        data = self.data.copy()
        invalid_data = data.pop("context")
        response = self.client.post(url, invalid_data, format="json")
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)

    @patch(
        "kolibri.core.errorreports.models.ErrorReports.insert_or_update_error",
        side_effect=AttributeError("Mocked AttributeError"),
    )
    def test_frontend_report_server_error_attribute_error(
        self, mock_insert_or_update_error
    ):
        url = reverse("kolibri:core:report")
        response = self.client.post(url, self.data, format="json")
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    @patch(
        "kolibri.core.errorreports.models.ErrorReports.insert_or_update_error",
        side_effect=ValidationError("Mocked exception"),
    )
    def test_frontend_report_server_error_validation_error(
        self, mock_insert_or_update_error
    ):
        url = reverse("kolibri:core:report")
        response = self.client.post(url, self.data, format="json")
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
