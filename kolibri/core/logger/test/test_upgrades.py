import tempfile
from uuid import uuid4

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.test import TestCase
from django.utils import timezone

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.upgrade import fix_masterylog_end_timestamps
from kolibri.core.logger.upgrade import move_csv_files_to_private_storage
from kolibri.core.storage import private_storage


class MasteryLogEndTimestampUpgradeTest(TestCase):
    def setUp(self):
        self.facility = Facility.objects.create()
        self.user = FacilityUser.objects.create(
            username="learner", facility=self.facility
        )
        now = timezone.now()

        # Create base content summary log
        self.summary_log = ContentSummaryLog.objects.create(
            user=self.user,
            content_id=uuid4().hex,
            channel_id=uuid4().hex,
            kind="exercise",
            start_timestamp=now,
            end_timestamp=now + timezone.timedelta(minutes=10),
        )

        # Case 1: MasteryLog with attempts
        self.attempt_session = ContentSessionLog.objects.create(
            user=self.user,
            content_id=self.summary_log.content_id,
            channel_id=self.summary_log.channel_id,
            kind="exercise",
            start_timestamp=now,
            end_timestamp=now + timezone.timedelta(minutes=3),
        )

        self.attempt_mastery = MasteryLog.objects.create(
            user=self.user,
            summarylog=self.summary_log,
            mastery_level=2,
            start_timestamp=now,
            end_timestamp=now,
        )

        AttemptLog.objects.create(
            masterylog=self.attempt_mastery,
            sessionlog=self.attempt_session,
            start_timestamp=now,
            end_timestamp=now - timezone.timedelta(minutes=3),
            complete=True,
            correct=1,
        )

        AttemptLog.objects.create(
            masterylog=self.attempt_mastery,
            sessionlog=self.attempt_session,
            start_timestamp=now,
            end_timestamp=now - timezone.timedelta(minutes=2),
            complete=True,
            correct=1,
        )

        self.last_attempt = AttemptLog.objects.create(
            masterylog=self.attempt_mastery,
            sessionlog=self.attempt_session,
            start_timestamp=now,
            end_timestamp=now + timezone.timedelta(minutes=3),
            complete=True,
            correct=1,
        )

        # Case 2: MasteryLog with only summary log
        self.summary_session = ContentSessionLog.objects.create(
            user=self.user,
            content_id=self.summary_log.content_id,
            channel_id=self.summary_log.channel_id,
            kind="exercise",
            start_timestamp=now,
            end_timestamp=now,
        )
        self.summary_only_mastery = MasteryLog.objects.create(
            user=self.user,
            summarylog=self.summary_log,
            mastery_level=3,
            start_timestamp=now,
            end_timestamp=now,
        )

        fix_masterylog_end_timestamps()

    def test_attempt_logs_case(self):
        """Test MasteryLog with attempt logs gets end_timestamp from last attempt"""
        self.attempt_mastery.refresh_from_db()
        self.assertEqual(
            self.attempt_mastery.end_timestamp, self.last_attempt.end_timestamp
        )

    def test_summary_log_case(self):
        """Test MasteryLog with only summary log gets end_timestamp from summary"""
        self.summary_only_mastery.refresh_from_db()
        self.assertEqual(
            self.summary_only_mastery.end_timestamp, self.summary_log.end_timestamp
        )


class MoveCSVFilesToPrivateStorageTest(TestCase):
    def setUp(self):
        media_root = tempfile.TemporaryDirectory()
        self.addCleanup(media_root.cleanup)
        private_root = tempfile.TemporaryDirectory()
        self.addCleanup(private_root.cleanup)
        storage_settings = self.settings(
            MEDIA_ROOT=media_root.name,
            PRIVATE_FILE_STORAGE={
                "BACKEND": "django.core.files.storage.FileSystemStorage",
                "OPTIONS": {"location": private_root.name},
            },
        )
        storage_settings.enable()
        self.addCleanup(storage_settings.disable)

    def test_moves_exports_and_uploads_out_of_media(self):
        filenames = ["log_export/facility_users.csv", "temp/tmpupload.upload.csv"]
        for filename in filenames:
            default_storage.save(filename, ContentFile(filename.encode()))

        move_csv_files_to_private_storage()

        for filename in filenames:
            self.assertFalse(default_storage.exists(filename))
            with private_storage.open(filename, "rb") as f:
                self.assertEqual(f.read(), filename.encode())

    def test_replaces_file_left_by_interrupted_move(self):
        filename = "log_export/facility_users.csv"
        default_storage.save(filename, ContentFile(b"media copy"))
        private_storage.save(filename, ContentFile(b"partial copy"))

        move_csv_files_to_private_storage()

        self.assertEqual(
            private_storage.listdir("log_export")[1], ["facility_users.csv"]
        )
        with private_storage.open(filename, "rb") as f:
            self.assertEqual(f.read(), b"media copy")

    def test_runs_when_media_has_no_csv_folders(self):
        move_csv_files_to_private_storage()
