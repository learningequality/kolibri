import datetime
import uuid
from random import choice
from random import uniform

from django.core.exceptions import MultipleObjectsReturned
from django.test import TestCase
from le_utils.constants import exercises

from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.test.factory_logger import FacilityUserFactory
from kolibri.core.logger.utils.attempt_log_consolidation import (
    consolidate_quiz_attempt_logs,
)
from kolibri.utils.time_utils import local_now


class ConsolidateBase(TestCase):
    MASTERY_LEVEL = -1
    MASTERY_CRITERION = {"type": exercises.QUIZ, "coach_assigned": True}

    def setUp(self):
        self.facility = FacilityFactory.create()
        self.user = FacilityUserFactory.create(facility=self.facility)

        self.content_id = uuid.uuid4().hex
        self.node_id = uuid.uuid4().hex

        self.session_log = ContentSessionLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="exercise",
            extra_fields={
                "context": {
                    "quiz_id": self.content_id,
                    "mastery_level": self.MASTERY_LEVEL,
                }
            },
        )
        self.summary_log = ContentSummaryLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="exercise",
        )

        self.mastery_log = MasteryLog.objects.create(
            mastery_criterion=self.MASTERY_CRITERION,
            summarylog=self.summary_log,
            start_timestamp=self.summary_log.start_timestamp,
            user=self.user,
            mastery_level=self.MASTERY_LEVEL,
        )
        for i in range(3):
            AttemptLog.objects.create(
                item="item_{i}".format(i=i),
                start_timestamp=local_now(),
                end_timestamp=local_now(),
                time_spent=uniform(1.0, 10.0),
                correct=choice([0, 1]),
                user=self.user,
                masterylog=self.mastery_log,
                sessionlog=self.session_log,
            )

        # Create duplicated AttemptLog instances
        self.duplicated_item = "duplicate"
        five_minutes = datetime.timedelta(minutes=5)
        for i in range(5):
            AttemptLog.objects.create(
                item=self.duplicated_item,
                start_timestamp=local_now() - five_minutes * (i + 2),
                end_timestamp=local_now() - five_minutes * (-1) ** i * (i + 1),
                time_spent=uniform(1.0, 10.0),
                correct=choice([0, 1]),
                user=self.user,
                masterylog=self.mastery_log,
                sessionlog=self.session_log,
            )


class ConsolidateAttemptLogsCoachQuizTestCase(ConsolidateBase, TestCase):
    MASTERY_LEVEL = -1
    MASTERY_CRITERION = {"type": exercises.QUIZ, "coach_assigned": True}

    def test_consolidation(self):
        end_timestamp = (
            AttemptLog.objects.filter(item=self.duplicated_item)
            .order_by("-end_timestamp")[0]
            .end_timestamp
        )
        start_timestamp = (
            AttemptLog.objects.filter(item=self.duplicated_item)
            .order_by("start_timestamp")[0]
            .start_timestamp
        )
        duplicated_logs = AttemptLog.objects.filter(item=self.duplicated_item).order_by(
            "-end_timestamp"
        )
        time_spent = 0
        interaction_history = []
        for log in duplicated_logs:
            time_spent += log.time_spent
            interaction_history += log.interaction_history

        kept_id = duplicated_logs[0].id
        consolidate_quiz_attempt_logs(AttemptLog.objects.all())
        try:
            attemptlog = AttemptLog.objects.get(
                item=self.duplicated_item, user=self.user, masterylog=self.mastery_log
            )
        except AttemptLog.DoesNotExist:
            self.fail("AttemptLog was deleted not consolidated")
        except MultipleObjectsReturned:
            self.fail("Multiple AttemptLogs were not consolidated")

        self.assertEqual(attemptlog.start_timestamp, start_timestamp)
        self.assertEqual(attemptlog.end_timestamp, end_timestamp)
        self.assertEqual(attemptlog.time_spent, time_spent)
        self.assertEqual(attemptlog.interaction_history, interaction_history)
        self.assertEqual(attemptlog.id, kept_id)
        for i in range(3):
            try:
                AttemptLog.objects.get(
                    item="item_{i}".format(i=i),
                    user=self.user,
                    masterylog=self.mastery_log,
                )
            except AttemptLog.DoesNotExist:
                self.fail("AttemptLog was deleted when it was already unique")


class ConsolidateAttemptLogsPracticeQuizTestCase(
    ConsolidateAttemptLogsCoachQuizTestCase
):
    MASTERY_CRITERION = {"type": exercises.QUIZ}


class ConsolidateAttemptLogsExerciseTestCase(ConsolidateBase, TestCase):
    """
    This case is purely to ensure against any consolidation happening for exercises
    """

    MASTERY_LEVEL = 1
    MASTERY_CRITERION = {"type": exercises.M_OF_N, "m": 8, "n": 10}

    def test_no_consolidation(self):
        consolidate_quiz_attempt_logs(AttemptLog.objects.all())
        self.assertEqual(
            AttemptLog.objects.filter(item=self.duplicated_item).count(), 5
        )
