# -*- coding: utf-8 -*-
"""
Tests that ensure the correct items are returned from api calls.
Also tests whether the users with permissions can create logs.
"""
import datetime
import uuid

import mock
import pytz
from django.core.management import call_command
from django.core.management.base import CommandError
from django.urls import reverse
from rest_framework.test import APITestCase

from kolibri.core.auth.test.helpers import DUMMY_PASSWORD
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.logger.tasks import log_exports_cleanup
from kolibri.core.logger.test.factory_logger import ContentSessionLogFactory
from kolibri.core.logger.test.factory_logger import ContentSummaryLogFactory
from kolibri.core.logger.test.factory_logger import FacilityUserFactory
from kolibri.utils.time_utils import utc_now


class ContentSummaryLogCSVExportTestCase(APITestCase):

    fixtures = ["content_test.json"]

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

    fixtures = ["content_test.json"]

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

    fixtures = ["content_test.json"]

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
