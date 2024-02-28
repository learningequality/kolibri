# -*- coding: utf-8 -*-
"""
Tests that ensure the correct items are returned from api calls.
Also tests whether the users with permissions can create logs.
"""
import csv
import datetime
import os
import tempfile
import uuid

import mock
import pytz
from django.core.management import call_command
from django.urls import reverse
from rest_framework.test import APITestCase

from ..models import ContentSessionLog
from ..models import ContentSummaryLog
from ..models import GenerateCSVLogRequest
from ..models import MasteryLog
from .factory_logger import ContentSessionLogFactory
from .factory_logger import ContentSummaryLogFactory
from .factory_logger import FacilityUserFactory
from .helpers import EvaluationMixin
from kolibri.core.auth.management.commands.bulkexportusers import (
    CSV_EXPORT_FILENAMES as USER_CSV_EXPORT_FILENAMES,
)
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.logger.csv_export import labels
from kolibri.core.logger.tasks import get_filepath
from kolibri.core.logger.tasks import log_exports_cleanup
from kolibri.utils import conf
from kolibri.utils.time_utils import local_now


class ContentSummaryLogCSVExportTestCase(APITestCase):

    databases = "__all__"

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
        cls.end_date = local_now().isoformat()

    def test_csv_download(self):
        expected_count = ContentSummaryLog.objects.count()
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportlogs",
            log_type="summary",
            output_file=filepath,
            overwrite=True,
            start_date=self.start_date,
            end_date=self.end_date,
        )
        with open(filepath, "r", newline="") as f:
            results = list(csv.reader(f))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)
        self.assertTrue(
            GenerateCSVLogRequest.objects.filter(
                log_type="summary", facility=self.facility.id
            ).exists()
        )

    def test_csv_download_deleted_content(self):
        expected_count = ContentSummaryLog.objects.count()
        ContentNode.objects.all().delete()
        ChannelMetadata.objects.all().delete()
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportlogs",
            log_type="summary",
            output_file=filepath,
            overwrite=True,
            start_date=self.start_date,
            end_date=self.end_date,
        )
        with open(filepath, "r", newline="") as f:
            results = list(csv.reader(f))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)
        self.assertTrue(
            GenerateCSVLogRequest.objects.filter(
                log_type="summary", facility=self.facility.id
            ).exists()
        )

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
            "exportlogs",
            log_type="summary",
            output_file=filepath,
            overwrite=True,
            start_date=self.start_date,
            end_date=self.end_date,
        )
        with open(filepath, "r", newline="") as f:
            results = list(csv.reader(f))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)
        self.assertTrue(
            GenerateCSVLogRequest.objects.filter(
                log_type="summary", facility=self.facility.id
            ).exists()
        )

    @mock.patch.object(log_exports_cleanup, "enqueue", return_value=None)
    def test_csv_cleanup(self, mock_enqueue):
        # generate summary csv
        log_type = "summary"
        start_date = "2023-03-05 00:00:00"
        end_date = "2023-03-10 00:00:00"
        filepath = get_filepath(log_type, self.facility.id, start_date, end_date)
        call_command(
            "exportlogs",
            log_type=log_type,
            output_file=filepath,
            overwrite=True,
            start_date=start_date,
            end_date=end_date,
        )

        # generate another summary csv
        start_date_2 = "2023-03-11 00:00:00"
        end_date_2 = "2023-03-12 00:00:00"
        filepath_2 = get_filepath(log_type, self.facility.id, start_date_2, end_date_2)
        call_command(
            "exportlogs",
            log_type=log_type,
            output_file=filepath_2,
            overwrite=True,
            start_date=start_date_2,
            end_date=end_date_2,
        )
        # generate users csv
        call_command(
            "bulkexportusers",
            facility=self.facility.id,
            overwrite=True,
        )
        # execute cleanup
        # latest should persist and the old one should be deleted
        log_exports_cleanup()

        logs_dir = os.path.join(conf.KOLIBRI_HOME, "log_export")
        # currently there are two file. logs export and users csv export
        assert len(os.listdir(logs_dir)) == 2
        assert os.path.basename(filepath_2) in os.listdir(logs_dir)
        assert os.path.basename(filepath) not in os.listdir(logs_dir)

        # make sure the csv file for the record saved in the database exists
        log_request = GenerateCSVLogRequest.objects.get(log_type=log_type)
        date_format = "%Y-%m-%d"
        expected_file_path = get_filepath(
            log_request.log_type,
            log_request.facility_id,
            log_request.selected_start_date.strftime(date_format),
            log_request.selected_end_date.strftime(date_format),
        )
        expected_users_csv_file_path = USER_CSV_EXPORT_FILENAMES["user"].format(
            self.facility.name, self.facility.id[:4]
        )
        assert os.path.basename(expected_file_path) in os.listdir(logs_dir)
        assert expected_users_csv_file_path in os.listdir(logs_dir)
        assert mock_enqueue.has_calls(2)


class ContentSessionLogCSVExportTestCase(APITestCase):
    databases = "__all__"

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
        cls.end_date = local_now().isoformat()

    def test_csv_download(self):
        expected_count = ContentSessionLog.objects.count()
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportlogs",
            log_type="session",
            output_file=filepath,
            overwrite=True,
            start_date=self.start_date,
            end_date=self.end_date,
        )
        with open(filepath, "r", newline="") as f:
            results = list(csv.reader(f))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)
        self.assertTrue(
            GenerateCSVLogRequest.objects.filter(
                log_type="session", facility=self.facility.id
            ).exists()
        )

    def test_csv_download_deleted_content(self):
        expected_count = ContentSessionLog.objects.count()
        ContentNode.objects.all().delete()
        ChannelMetadata.objects.all().delete()
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportlogs",
            log_type="session",
            output_file=filepath,
            overwrite=True,
            start_date=self.start_date,
            end_date=self.end_date,
        )
        with open(filepath, "r", newline="") as f:
            results = list(csv.reader(f))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)
        self.assertTrue(
            GenerateCSVLogRequest.objects.filter(
                log_type="session", facility=self.facility.id
            ).exists()
        )

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
            "exportlogs",
            log_type="session",
            output_file=filepath,
            overwrite=True,
            start_date=self.start_date,
            end_date=self.end_date,
        )
        with open(filepath, "r", newline="") as f:
            results = list(csv.reader(f))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)
        self.assertTrue(
            GenerateCSVLogRequest.objects.filter(
                log_type="session", facility=self.facility.id
            ).exists()
        )

    def test_csv_download_no_completion_timestamp(self):
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportlogs",
            log_type="session",
            output_file=filepath,
            overwrite=True,
            start_date=self.start_date,
            end_date=self.end_date,
        )
        with open(filepath, "r", newline="") as f:
            results = list(csv.reader(f))
        for column_label in results[0]:
            self.assertNotEqual(column_label, labels["completion_timestamp"])
        self.assertTrue(
            GenerateCSVLogRequest.objects.filter(
                log_type="session", facility=self.facility.id
            ).exists()
        )

    @mock.patch.object(log_exports_cleanup, "enqueue", return_value=None)
    def test_csv_cleanup(self, mock_enqueue):
        # generate session csv
        log_type = "session"
        start_date = "2023-03-05 00:00:00"
        end_date = "2023-03-10 00:00:00"
        filepath = get_filepath(log_type, self.facility.id, start_date, end_date)
        call_command(
            "exportlogs",
            log_type=log_type,
            output_file=filepath,
            overwrite=True,
            start_date=start_date,
            end_date=end_date,
        )

        # generate another session csv
        start_date_2 = "2023-03-11 00:00:00"
        end_date_2 = "2023-03-12 00:00:00"
        filepath_2 = get_filepath(log_type, self.facility.id, start_date_2, end_date_2)
        call_command(
            "exportlogs",
            log_type=log_type,
            output_file=filepath_2,
            overwrite=True,
            start_date=start_date_2,
            end_date=end_date_2,
        )
        # generate users csv
        call_command(
            "bulkexportusers",
            facility=self.facility.id,
            overwrite=True,
        )
        # execute cleanup
        # latest csv should persist and the old one should be deleted
        log_exports_cleanup()

        logs_dir = os.path.join(conf.KOLIBRI_HOME, "log_export")
        # currently there are two file. logs export and users csv export
        assert len(os.listdir(logs_dir)) == 2
        assert os.path.basename(filepath_2) in os.listdir(logs_dir)
        assert os.path.basename(filepath) not in os.listdir(logs_dir)

        # make sure the csv file for the record saved in the database exists
        log_request = GenerateCSVLogRequest.objects.get(log_type=log_type)
        date_format = "%Y-%m-%d"
        expected_file_path = get_filepath(
            log_request.log_type,
            log_request.facility_id,
            log_request.selected_start_date.strftime(date_format),
            log_request.selected_end_date.strftime(date_format),
        )
        expected_users_csv_file_path = USER_CSV_EXPORT_FILENAMES["user"].format(
            self.facility.name, self.facility.id[:4]
        )
        assert os.path.basename(expected_file_path) in os.listdir(logs_dir)
        assert expected_users_csv_file_path in os.listdir(logs_dir)
        assert mock_enqueue.has_calls(2)


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


class TotalContentProgressViewSetTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        cls.user1 = FacilityUserFactory.create(facility=cls.facility)
        cls.summary_logs = [
            ContentSummaryLogFactory.create(
                user=cls.user1,
                content_id=uuid.uuid4().hex,
                channel_id="6199dde695db4ee4ab392222d5af1e5c",
            )
            for _ in range(3)
        ]

    def test_summary_logs_only_no_complete(self):
        self.client.force_login(self.user1)
        response = self.client.get(
            reverse("kolibri:core:userprogress-detail", kwargs={"pk": self.user1.id}),
        )
        self.assertEqual(response.data["progress"], 0)

    def test_summary_logs_only_some_complete(self):
        log = self.summary_logs[0]
        log.progress = 1.0
        log.save()
        self.client.force_login(self.user1)
        response = self.client.get(
            reverse("kolibri:core:userprogress-detail", kwargs={"pk": self.user1.id}),
        )
        self.assertEqual(response.data["progress"], 1)

    def test_summary_logs_all_some_complete(self):
        ContentSummaryLog.objects.all().update(progress=1.0)
        self.client.force_login(self.user1)
        response = self.client.get(
            reverse("kolibri:core:userprogress-detail", kwargs={"pk": self.user1.id}),
        )
        self.assertEqual(response.data["progress"], 3)

    def test_mastery_logs_no_complete(self):
        MasteryLog.objects.create(
            summarylog=self.summary_logs[0],
            mastery_level=1,
            user=self.user1,
            start_timestamp=local_now(),
        )
        self.client.force_login(self.user1)
        response = self.client.get(
            reverse("kolibri:core:userprogress-detail", kwargs={"pk": self.user1.id}),
        )
        self.assertEqual(response.data["progress"], 0)

    def test_mastery_logs_no_complete_conflict_with_summarylog(self):
        MasteryLog.objects.create(
            summarylog=self.summary_logs[0],
            mastery_level=1,
            user=self.user1,
            start_timestamp=local_now(),
        )
        self.summary_logs[0].complete = True
        self.summary_logs[0].save()
        self.client.force_login(self.user1)
        response = self.client.get(
            reverse("kolibri:core:userprogress-detail", kwargs={"pk": self.user1.id}),
        )
        self.assertEqual(response.data["progress"], 0)

    def test_mastery_log_complete_conflict_with_summarylog(self):
        MasteryLog.objects.create(
            summarylog=self.summary_logs[0],
            mastery_level=1,
            user=self.user1,
            start_timestamp=local_now(),
            complete=True,
        )
        self.client.force_login(self.user1)
        response = self.client.get(
            reverse("kolibri:core:userprogress-detail", kwargs={"pk": self.user1.id}),
        )
        self.assertEqual(response.data["progress"], 1)

    def test_mastery_logs_all_summarylog_complete_one_masterylog_complete(self):
        MasteryLog.objects.create(
            summarylog=self.summary_logs[0],
            mastery_level=1,
            user=self.user1,
            start_timestamp=local_now(),
            complete=True,
        )
        ContentSummaryLog.objects.all().update(progress=1.0)
        self.client.force_login(self.user1)
        response = self.client.get(
            reverse("kolibri:core:userprogress-detail", kwargs={"pk": self.user1.id}),
        )
        self.assertEqual(response.data["progress"], 3)

    def test_mastery_logs_all_summarylog_complete_three_masterylog_complete_one_incomplete(
        self,
    ):
        MasteryLog.objects.create(
            summarylog=self.summary_logs[0],
            mastery_level=1,
            user=self.user1,
            start_timestamp=local_now(),
        )
        for i in range(2, 5):
            MasteryLog.objects.create(
                summarylog=self.summary_logs[0],
                mastery_level=i,
                user=self.user1,
                start_timestamp=local_now(),
                complete=True,
            )
        ContentSummaryLog.objects.all().update(progress=1.0)
        self.client.force_login(self.user1)
        response = self.client.get(
            reverse("kolibri:core:userprogress-detail", kwargs={"pk": self.user1.id}),
        )
        self.assertEqual(response.data["progress"], 5)
