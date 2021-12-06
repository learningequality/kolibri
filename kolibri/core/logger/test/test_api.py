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
from django.core.urlresolvers import reverse
from rest_framework.test import APITestCase

from ..models import ContentSessionLog
from ..models import ContentSummaryLog
from .factory_logger import ContentSessionLogFactory
from .factory_logger import ContentSummaryLogFactory
from .factory_logger import FacilityUserFactory
from .helpers import EvaluationMixin
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


class MasteryLogViewSetTestCase(EvaluationMixin, APITestCase):
    def test_summary(self):
        for content_index, content_id in enumerate(self.content_ids):
            content_mod = content_index % 2
            for user_index, user in enumerate(self.users):
                self.client.force_login(user)
                response = self.client.get(
                    reverse("kolibri:core:masterylog-list"),
                    data={
                        "content": content_id,
                        "user": user.id,
                        "complete": True,
                        "quiz": True,
                    },
                )
                user_mod = user_index % 2
                tries_count = (
                    len(self.user_tries[user_index]) if content_mod == user_mod else 0
                )
                self.assertEqual(tries_count, len(response.data))
                for try_index, mastery_log in enumerate(response.data):
                    self.assertEqual(
                        self.user_tries[user_index][try_index].id, mastery_log["id"]
                    )

    def test_diff(self):
        for user_index, user_tries in enumerate(self.user_tries):
            for try_index, user_try in enumerate(user_tries):
                self.client.force_login(self.users[user_index])
                response = self.client.get(
                    reverse("kolibri:core:masterylog-diff", kwargs={"pk": try_index}),
                    data={
                        "content": user_try.summarylog.content_id,
                        "user": user_try.user_id,
                        "complete": True,
                        "quiz": True,
                    },
                )
                diff = response.data.get("diff")
                if try_index > 0 or user_index in (0, 1):
                    self.assertIsNone(diff)
                elif user_index == 2:
                    self.assertEqual(
                        diff,
                        {
                            "correct": 0.0,
                            "time_spent": -30 * 60,
                        },
                    )
                elif user_index == 3:
                    self.assertEqual(
                        diff,
                        {
                            "correct": -3.0,
                            "time_spent": -30 * 60,
                        },
                    )
                elif user_index == 4:
                    self.assertEqual(
                        diff,
                        {
                            "correct": 3.0,
                            "time_spent": -30 * 60,
                        },
                    )
                elif user_index == 5:
                    self.assertEqual(
                        diff,
                        {
                            "correct": 0.0,
                            "time_spent": -30 * 60,
                        },
                    )
                if try_index == 0:
                    self.assertAttemptDiffs(response.data.get("attemptlogs"))
                else:
                    for attempt_log in response.data.get("attemptlogs"):
                        self.assertEqual(attempt_log["diff"], {"correct": None})

    def test_diff_no_attempts_first_try(self):
        user_index = 2
        try_index = 0
        user_try = self.user_tries[user_index][try_index]
        user_try.attemptlogs.all().delete()
        self.client.force_login(self.users[user_index])
        response = self.client.get(
            reverse("kolibri:core:masterylog-diff", kwargs={"pk": try_index}),
            data={
                "content": user_try.summarylog.content_id,
                "user": user_try.user_id,
                "complete": True,
                "quiz": True,
            },
        )
        diff = response.data.get("diff")
        self.assertEqual(diff["correct"], -3.0)

    def test_diff_no_attempts_second_try(self):
        user_index = 2
        try_index = 0
        user_try = self.user_tries[user_index][try_index + 1]
        user_try.attemptlogs.all().delete()
        self.client.force_login(self.users[user_index])
        response = self.client.get(
            reverse("kolibri:core:masterylog-diff", kwargs={"pk": try_index}),
            data={
                "content": user_try.summarylog.content_id,
                "user": user_try.user_id,
                "complete": True,
                "quiz": True,
            },
        )
        diff = response.data.get("diff")
        self.assertEqual(diff["correct"], 3.0)
