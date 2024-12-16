from uuid import uuid4

from django.test import TestCase
from django.utils import timezone

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.upgrade import fix_masterylog_end_timestamps


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
