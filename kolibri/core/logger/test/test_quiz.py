import datetime

from django.test import TestCase
from django.utils import timezone

from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.utils.quiz import annotate_response_summary

from .helpers import EvaluationMixin


class AnnotateResponseSummaryQuizTryTestCase(EvaluationMixin, TestCase):
    MASTERY_LEVELS = (-1, -2)

    def setUp(self):
        self.try_items = self.items[self.content_ids[0]]

    def _create_user_try(self, end_timestamp=None, mastery_level=None):
        return self._create_try(
            0,
            True,
            end_timestamp or timezone.now(),
            mastery_level=mastery_level or self.MASTERY_LEVELS[0],
        )

    def assertSummary(self, try_log, num_correct, num_answered):
        summary = annotate_response_summary(
            MasteryLog.objects.filter(id=try_log.id)
        ).values("num_correct", "num_answered")[0]
        self.assertEqual(
            {"num_correct": num_correct, "num_answered": num_answered}, summary
        )

    def test_item_answered_wrong_then_right_counts_as_correct(self):
        try_log = self._create_user_try()
        self._create_attempt_before(try_log, self.try_items[0], 0)
        self.assertSummary(try_log, 3, 3)

    def test_item_answered_right_then_wrong_counts_as_incorrect(self):
        try_log = self._create_user_try()
        self._create_attempt_after(try_log, self.try_items[0], 0)
        self.assertSummary(try_log, 2, 3)

    def test_items_answered_right_twice_count_once(self):
        try_log = self._create_user_try()
        for item in self.try_items:
            self._create_attempt_after(try_log, item, 1)
        self.assertSummary(try_log, 3, 3)

    def test_attempts_with_equal_end_timestamp_count_once(self):
        try_log = self._create_user_try()
        first = try_log.attemptlogs.get(item=self.try_items[0])
        self._create_attempt(try_log, self.try_items[0], 1, first.end_timestamp)
        self.assertSummary(try_log, 3, 3)

    def test_correct_and_wrong_attempts_with_equal_end_timestamp_count_as_correct(
        self,
    ):
        try_log = self._create_user_try()
        first = try_log.attemptlogs.get(item=self.try_items[0])
        self._create_attempt(try_log, self.try_items[0], 0, first.end_timestamp)
        self.assertSummary(try_log, 3, 3)

    def test_partially_correct_latest_attempt_is_answered_not_correct(self):
        try_log = self._create_user_try()
        self._create_attempt_after(try_log, self.try_items[0], 0.5)
        self.assertSummary(try_log, 2, 3)

    def test_all_latest_attempts_wrong_counts_zero_correct(self):
        try_log = self._create_user_try()
        for item in self.try_items:
            self._create_attempt_after(try_log, item, 0)
        self.assertSummary(try_log, 0, 3)

    def test_try_without_attempts_has_no_counts(self):
        try_log = self._create_user_try()
        try_log.attemptlogs.all().delete()
        self.assertSummary(try_log, None, None)

    def test_each_try_counts_only_its_own_attempts(self):
        previous_try = self._create_user_try(
            end_timestamp=timezone.now() - datetime.timedelta(hours=2)
        )
        self._create_attempt_after(previous_try, self.try_items[0], 0)
        current_try = self._create_user_try(mastery_level=self.MASTERY_LEVELS[1])
        self.assertSummary(previous_try, 2, 3)
        self.assertSummary(current_try, 3, 3)


class AnnotateResponseSummaryExerciseTryTestCase(
    AnnotateResponseSummaryQuizTryTestCase
):
    MASTERY_LEVELS = (1, 2)
