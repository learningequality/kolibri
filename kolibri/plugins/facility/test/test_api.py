# -*- coding: utf-8 -*-
"""
Tests that ensure the correct items are returned from api calls.
Also tests whether the users with permissions can create logs.
"""
import os
import uuid

from django.core.management import call_command
from django.urls import reverse
from rest_framework.test import APITestCase

from kolibri.core.auth.test.helpers import DUMMY_PASSWORD
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.logger.test.factory_logger import ContentSessionLogFactory
from kolibri.core.logger.test.factory_logger import ContentSummaryLogFactory
from kolibri.core.logger.test.factory_logger import FacilityUserFactory
from kolibri.plugins.facility.views import CSV_EXPORT_FILENAMES
from kolibri.utils import conf


def output_filename(log_type, facility):
    logs_dir = os.path.join(conf.KOLIBRI_HOME, "log_export")
    if not os.path.isdir(logs_dir):
        os.mkdir(logs_dir)
    return os.path.join(
        logs_dir,
        CSV_EXPORT_FILENAMES[log_type].format(facility.name, facility.id[:4]),
    )


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

    def test_csv_download_anonymous_permissions(self):
        call_command(
            "exportlogs",
            log_type="summary",
            output_file=output_filename("summary", self.facility),
            overwrite=True,
        )
        response = self.client.get(
            reverse(
                "kolibri:kolibri.plugins.facility:download_csv_file",
                kwargs={"csv_type": "summary", "facility_id": self.facility.id},
            )
        )
        self.assertEqual(response.status_code, 403)

    def test_csv_download_non_admin_permissions(self):
        call_command(
            "exportlogs",
            log_type="summary",
            output_file=output_filename("summary", self.facility),
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
                kwargs={"csv_type": "summary", "facility_id": self.facility.id},
            )
        )
        self.assertEqual(response.status_code, 403)

    def test_csv_download_admin_permissions(self):
        call_command(
            "exportlogs",
            log_type="summary",
            output_file=output_filename("summary", self.facility),
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

    def test_csv_download_anonymous_permissions(self):
        call_command(
            "exportlogs",
            log_type="session",
            output_file=output_filename("session", self.facility),
            overwrite=True,
        )
        response = self.client.get(
            reverse(
                "kolibri:kolibri.plugins.facility:download_csv_file",
                kwargs={"csv_type": "session", "facility_id": self.facility.id},
            )
        )
        self.assertEqual(response.status_code, 403)

    def test_csv_download_non_admin_permissions(self):
        call_command(
            "exportlogs",
            log_type="session",
            output_file=output_filename("session", self.facility),
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
                kwargs={"csv_type": "session", "facility_id": self.facility.id},
            )
        )
        self.assertEqual(response.status_code, 403)

    def test_csv_download_admin_permissions(self):
        call_command(
            "exportlogs",
            log_type="session",
            output_file=output_filename("session", self.facility),
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
