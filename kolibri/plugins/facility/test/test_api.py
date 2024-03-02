# -*- coding: utf-8 -*-
"""
Tests that ensure the correct items are returned from api calls.
Also tests whether the users with permissions can create logs.
"""
import datetime
import os
import uuid

import mock
import pytz
from django.core.management import call_command
from django.urls import reverse
from rest_framework.test import APITestCase

from kolibri.core.auth.test.helpers import DUMMY_PASSWORD
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.logger.tasks import log_exports_cleanup
from kolibri.core.logger.test.factory_logger import ContentSessionLogFactory
from kolibri.core.logger.test.factory_logger import ContentSummaryLogFactory
from kolibri.core.logger.test.factory_logger import FacilityUserFactory
from kolibri.plugins.facility.views import CSV_EXPORT_FILENAMES
from kolibri.utils import conf
from kolibri.utils.time_utils import utc_now


def output_filename(log_type, facility, **kwargs):
    logs_dir = os.path.join(conf.KOLIBRI_HOME, "log_export")
    if not os.path.isdir(logs_dir):
        os.mkdir(logs_dir)
    if log_type in ("summary", "session"):
        start_date = kwargs.get("start_date")
        end_date = kwargs.get("end_date")
        log_path = os.path.join(
            logs_dir,
            CSV_EXPORT_FILENAMES[log_type].format(
                facility.name, facility.id[:4], start_date[:10], end_date[:10]
            ),
        )
    else:
        log_path = os.path.join(
            logs_dir,
            CSV_EXPORT_FILENAMES[log_type].format(facility.name, facility.id[:4]),
        )
    return log_path


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
            output_file=output_filename(
                "summary",
                self.facility,
                start_date=self.start_date,
                end_date=self.end_date,
            ),
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
            output_file=output_filename(
                "summary",
                self.facility,
                start_date=self.start_date,
                end_date=self.end_date,
            ),
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
            log_type="summary",
            output_file=output_filename(
                "summary",
                self.facility,
                start_date=self.start_date,
                end_date=self.end_date,
            ),
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
            output_file=output_filename(
                "session",
                self.facility,
                start_date=self.start_date,
                end_date=self.end_date,
            ),
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
            log_type="session",
            output_file=output_filename(
                "session",
                self.facility,
                start_date=self.start_date,
                end_date=self.end_date,
            ),
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
            log_type="session",
            output_file=output_filename(
                "session",
                self.facility,
                start_date=self.start_date,
                end_date=self.end_date,
            ),
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

    def test_csv_download_anonymous_permissions(self):
        call_command(
            "bulkexportusers",
            output_file=output_filename("user", self.facility),
            overwrite=True,
        )
        response = self.client.get(
            reverse(
                "kolibri:kolibri.plugins.facility:download_csv_file",
                kwargs={"csv_type": "user", "facility_id": self.facility.id},
            )
        )
        self.assertEqual(response.status_code, 403)

    def test_csv_download_non_admin_permissions(self):
        call_command(
            "bulkexportusers",
            output_file=output_filename("user", self.facility),
            overwrite=True,
        )
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
        call_command(
            "bulkexportusers",
            output_file=output_filename("user", self.facility),
            overwrite=True,
        )
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
