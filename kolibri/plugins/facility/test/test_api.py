"""
Tests that ensure the correct items are returned from api calls.
Also tests whether the users with permissions can create logs.
"""

import datetime
import uuid
from typing import ClassVar
from unittest import mock

import pytz
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management import call_command
from django.core.management.base import CommandError
from django.urls import reverse
from rest_framework.test import APITestCase

from kolibri.core.auth.test.helpers import DUMMY_PASSWORD
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.logger.csv_export import CSV_EXPORT_FILENAMES
from kolibri.core.logger.models import GenerateCSVLogRequest
from kolibri.core.logger.tasks import log_exports_cleanup
from kolibri.core.logger.test.factory_logger import ContentSessionLogFactory
from kolibri.core.logger.test.factory_logger import ContentSummaryLogFactory
from kolibri.core.logger.test.factory_logger import FacilityUserFactory
from kolibri.utils.time_utils import utc_now


class ContentSummaryLogCSVExportTestCase(APITestCase):
    databases = "__all__"

    fixtures: ClassVar[list] = ["content_test.json"]

    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.user1 = FacilityUserFactory.create(facility=cls.facility)
        cls.summary_logs = [
            ContentSummaryLogFactory.create(
                user=cls.user1,
                content_id=uuid.uuid4().hex,
                channel_id="6199dde695db4ee4ab392222d5af1e5c",
            )
            for _ in range(3)
        ]
        cls.facility.add_admin(cls.admin)
        cls.start_date = datetime.datetime(2020, 10, 21, tzinfo=pytz.UTC).isoformat()
        cls.end_date = utc_now().isoformat()

    @mock.patch.object(log_exports_cleanup, "enqueue", return_value=None)
    def test_csv_download_anonymous_permissions(self, mock_enqueue):
        call_command(
            "exportlogs",
            log_type="summary",
            use_storage=True,
            overwrite=True,
            start_date=self.start_date,
            end_date=self.end_date,
        )
        response = self.client.get(
            reverse(
                "kolibri:kolibri.plugins.facility:download_csv_file",
                kwargs={"csv_type": "summary", "facility_id": self.facility.id},
            )
        )
        self.assertEqual(response.status_code, 403)

    @mock.patch.object(log_exports_cleanup, "enqueue", return_value=None)
    def test_csv_download_non_admin_permissions(self, mock_enqueue):
        call_command(
            "exportlogs",
            log_type="summary",
            use_storage=True,
            overwrite=True,
            start_date=self.start_date,
            end_date=self.end_date,
        )
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(
            reverse(
                "kolibri:kolibri.plugins.facility:download_csv_file",
                kwargs={"csv_type": "summary", "facility_id": self.facility.id},
            )
        )
        self.assertEqual(response.status_code, 403)

    @mock.patch.object(log_exports_cleanup, "enqueue", return_value=None)
    def test_csv_download_admin_permissions(self, mock_enqueue):
        call_command(
            "exportlogs",
            use_storage=True,
            log_type="summary",
            overwrite=True,
            start_date=self.start_date,
            end_date=self.end_date,
        )
        self.client.login(
            username=self.admin.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(
            reverse(
                "kolibri:kolibri.plugins.facility:download_csv_file",
                kwargs={"csv_type": "summary", "facility_id": self.facility.id},
            )
        )
        self.assertEqual(response.status_code, 200)


class ContentSessionLogCSVExportTestCase(APITestCase):
    databases = "__all__"

    fixtures: ClassVar[list] = ["content_test.json"]

    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.user1 = FacilityUserFactory.create(facility=cls.facility)
        cls.interaction_logs = [
            ContentSessionLogFactory.create(
                user=cls.user1,
                content_id=uuid.uuid4().hex,
                channel_id="6199dde695db4ee4ab392222d5af1e5c",
            )
            for _ in range(3)
        ]
        cls.facility.add_admin(cls.admin)
        cls.start_date = datetime.datetime(2020, 10, 21, tzinfo=pytz.UTC).isoformat()
        cls.end_date = utc_now().isoformat()

    @mock.patch.object(log_exports_cleanup, "enqueue", return_value=None)
    def test_csv_download_anonymous_permissions(self, mock_enqueue):
        call_command(
            "exportlogs",
            log_type="session",
            use_storage=True,
            overwrite=True,
            start_date=self.start_date,
            end_date=self.end_date,
        )
        response = self.client.get(
            reverse(
                "kolibri:kolibri.plugins.facility:download_csv_file",
                kwargs={"csv_type": "session", "facility_id": self.facility.id},
            )
        )
        self.assertEqual(response.status_code, 403)

    @mock.patch.object(log_exports_cleanup, "enqueue", return_value=None)
    def test_csv_download_non_admin_permissions(self, mock_enqueue):
        call_command(
            "exportlogs",
            use_storage=True,
            log_type="session",
            overwrite=True,
            start_date=self.start_date,
            end_date=self.end_date,
        )
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(
            reverse(
                "kolibri:kolibri.plugins.facility:download_csv_file",
                kwargs={"csv_type": "session", "facility_id": self.facility.id},
            )
        )
        self.assertEqual(response.status_code, 403)

    @mock.patch.object(log_exports_cleanup, "enqueue", return_value=None)
    def test_csv_download_admin_permissions(self, mock_enqueue):
        call_command(
            "exportlogs",
            use_storage=True,
            log_type="session",
            overwrite=True,
            start_date=self.start_date,
            end_date=self.end_date,
        )
        self.client.login(
            username=self.admin.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(
            reverse(
                "kolibri:kolibri.plugins.facility:download_csv_file",
                kwargs={"csv_type": "session", "facility_id": self.facility.id},
            )
        )
        self.assertEqual(response.status_code, 200)


class UserCSVExportTestCase(APITestCase):
    databases = "__all__"

    fixtures: ClassVar[list] = ["content_test.json"]

    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.user1 = FacilityUserFactory.create(facility=cls.facility)
        cls.facility.add_admin(cls.admin)
        try:
            call_command(
                "bulkexportusers",
                use_storage=True,
                overwrite=True,
            )
        except CommandError:
            # This test fails on Windows for some reason that Richard and Jacob
            # could not deduce. Considering the following test passes and does
            # virtually the exact same thing AND it only fails on Windows, we
            # decided to bypass it this way for now
            pass

    def test_csv_download_anonymous_permissions(self):
        response = self.client.get(
            reverse(
                "kolibri:kolibri.plugins.facility:download_csv_file",
                kwargs={"csv_type": "user", "facility_id": self.facility.id},
            )
        )
        self.assertEqual(response.status_code, 403)

    def test_csv_download_non_admin_permissions(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(
            reverse(
                "kolibri:kolibri.plugins.facility:download_csv_file",
                kwargs={"csv_type": "user", "facility_id": self.facility.id},
            )
        )
        self.assertEqual(response.status_code, 403)

    def test_csv_download_admin_permissions(self):
        self.client.login(
            username=self.admin.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(
            reverse(
                "kolibri:kolibri.plugins.facility:download_csv_file",
                kwargs={"csv_type": "user", "facility_id": self.facility.id},
            )
        )
        self.assertEqual(response.status_code, 200)


class FacilityCSVViewsInputValidationTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        provision_device()
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.learner = FacilityUserFactory.create(facility=cls.facility)
        cls.facility.add_admin(cls.admin)

    def _login(self, user):
        self.client.login(
            username=user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def _get(self, url_name, **kwargs):
        return self.client.get(
            reverse("kolibri:kolibri.plugins.facility:" + url_name, kwargs=kwargs)
        )

    def test_malformed_facility_id_returns_404(self):
        requests = [
            ("firstlogdate", {"facility_id": "abc"}),
            ("exportedcsvinfo", {"facility_id": "abc"}),
            ("download_csv_file", {"csv_type": "user", "facility_id": "abc"}),
        ]
        for user in [self.admin, self.learner]:
            self._login(user)
            for url_name, kwargs in requests:
                with self.subTest(user=user.username, url_name=url_name):
                    response = self._get(url_name, **kwargs)
                    self.assertEqual(response.status_code, 404)

    def test_log_download_without_export_returns_404(self):
        self._login(self.admin)
        for csv_type in ["summary", "session"]:
            with self.subTest(csv_type=csv_type):
                response = self._get(
                    "download_csv_file",
                    csv_type=csv_type,
                    facility_id=self.facility.id,
                )
                self.assertEqual(response.status_code, 404)

    def test_unknown_csv_type_returns_404(self):
        self._login(self.admin)
        response = self._get(
            "download_csv_file", csv_type="unknown", facility_id=self.facility.id
        )
        self.assertEqual(response.status_code, 404)

    def test_exported_csv_info_empty_facility_id_uses_own_facility(self):
        log_request = GenerateCSVLogRequest.objects.create(
            facility=self.facility,
            log_type="summary",
            selected_start_date=utc_now(),
            selected_end_date=utc_now(),
        )
        filename = CSV_EXPORT_FILENAMES["summary"].format(
            self.facility.name,
            self.facility.id[:4],
            log_request.selected_start_date.isoformat()[:10],
            log_request.selected_end_date.isoformat()[:10],
        )
        saved_filename = default_storage.save(filename, ContentFile(b""))
        self.addCleanup(default_storage.delete, saved_filename)

        self._login(self.admin)
        response = self._get("exportedcsvinfo", facility_id="")
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.json()["summary"])
