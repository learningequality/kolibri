from django.test import override_settings
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from ..models import ErrorReports


class FrontendReportTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        self.client = APIClient()

    @override_settings(DEVELOPER_MODE=False)
    def test_frontend_report_prod_mode(self):
        url = reverse("kolibri:core:frontendreport")
        data = {
            "error_from": ErrorReports.FRONTEND,
            "error_message": "Something went wrong",
            "traceback": "Traceback information",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ErrorReports.objects.count(), 1)
        error = ErrorReports.objects.first()
        self.assertEqual(error.error_from, ErrorReports.FRONTEND)
        self.assertEqual(error.error_message, "Something went wrong")
        self.assertEqual(error.traceback, "Traceback information")

    @override_settings(DEVELOPER_MODE=True)
    def test_frontend_report_dev_mode(self):
        url = reverse("kolibri:core:frontendreport")
        data = {
            "error_from": ErrorReports.FRONTEND,
            "error_message": "Something went wrong",
            "traceback": "Traceback information",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(ErrorReports.objects.count(), 0)

    def test_frontend_report_invalid_data(self):
        url = reverse("kolibri:core:frontendreport")
        data = {
            "error_from": ErrorReports.FRONTEND,
            "error_message": "",
            "traceback": "Traceback information",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ErrorReports.objects.count(), 0)
