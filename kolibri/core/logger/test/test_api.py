# -*- coding: utf-8 -*-
"""
Tests that ensure the correct items are returned from api calls.
Also tests whether the users with permissions can create logs.
"""
import csv
import sys
import tempfile
import uuid

from django.core.management import call_command
from rest_framework.test import APITestCase

from ..models import ContentSessionLog
from ..models import ContentSummaryLog
from .factory_logger import ContentSessionLogFactory
from .factory_logger import ContentSummaryLogFactory
from .factory_logger import FacilityUserFactory
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode


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

    def test_csv_download(self):
        expected_count = ContentSummaryLog.objects.count()
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportlogs", log_type="summary", output_file=filepath, overwrite=True
        )
        if sys.version_info[0] < 3:
            csv_file = open(filepath, "rb")
        else:
            csv_file = open(filepath, "r", newline="")
        with csv_file as f:
            results = list(csv.reader(f))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)

    def test_csv_download_deleted_content(self):
        expected_count = ContentSummaryLog.objects.count()
        ContentNode.objects.all().delete()
        ChannelMetadata.objects.all().delete()
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportlogs", log_type="summary", output_file=filepath, overwrite=True
        )
        if sys.version_info[0] < 3:
            csv_file = open(filepath, "rb")
        else:
            csv_file = open(filepath, "r", newline="")
        with csv_file as f:
            results = list(csv.reader(f))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)

    def test_csv_download_unicode_username(self):
        user = FacilityUserFactory.create(
            facility=self.facility, username="كوليبري", full_name="كوليبري"
        )
        for _ in range(3):
            ContentSummaryLogFactory.create(
                user=user,
                content_id=uuid.uuid4().hex,
                channel_id="6199dde695db4ee4ab392222d5af1e5c",
            )

        expected_count = ContentSummaryLog.objects.count()
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportlogs", log_type="summary", output_file=filepath, overwrite=True
        )
        if sys.version_info[0] < 3:
            csv_file = open(filepath, "rb")
        else:
            csv_file = open(filepath, "r", newline="")
        with csv_file as f:
            results = list(csv.reader(f))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)


class ContentSessionLogCSVExportTestCase(APITestCase):

    fixtures = ["content_test.json"]

    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.user = FacilityUserFactory.create(facility=cls.facility)
        cls.interaction_logs = [
            ContentSessionLogFactory.create(
                user=cls.user,
                content_id=uuid.uuid4().hex,
                channel_id="6199dde695db4ee4ab392222d5af1e5c",
            )
            for _ in range(3)
        ]
        cls.facility.add_admin(cls.admin)

    def test_csv_download(self):
        expected_count = ContentSessionLog.objects.count()
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportlogs", log_type="session", output_file=filepath, overwrite=True
        )
        if sys.version_info[0] < 3:
            csv_file = open(filepath, "rb")
        else:
            csv_file = open(filepath, "r", newline="")
        with csv_file as f:
            results = list(csv.reader(f))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)

    def test_csv_download_deleted_content(self):
        expected_count = ContentSessionLog.objects.count()
        ContentNode.objects.all().delete()
        ChannelMetadata.objects.all().delete()
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportlogs", log_type="session", output_file=filepath, overwrite=True
        )
        if sys.version_info[0] < 3:
            csv_file = open(filepath, "rb")
        else:
            csv_file = open(filepath, "r", newline="")
        with csv_file as f:
            results = list(csv.reader(f))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)

    def test_csv_download_unicode_username(self):
        user = FacilityUserFactory.create(
            facility=self.facility, username="كوليبري", full_name="كوليبري"
        )
        for _ in range(3):
            ContentSessionLogFactory.create(
                user=user,
                content_id=uuid.uuid4().hex,
                channel_id="6199dde695db4ee4ab392222d5af1e5c",
            )

        expected_count = ContentSessionLog.objects.count()
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportlogs", log_type="session", output_file=filepath, overwrite=True
        )
        if sys.version_info[0] < 3:
            csv_file = open(filepath, "rb")
        else:
            csv_file = open(filepath, "r", newline="")
        with csv_file as f:
            results = list(csv.reader(f))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)
