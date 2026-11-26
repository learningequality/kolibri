from django.test import TestCase

from kolibri.core.logger.evaluation import attempts_diff
from kolibri.core.logger.models import AttemptLog

from .helpers import EvaluationMixin


class EvaluationTestCase(EvaluationMixin, TestCase):
    def test_attempts_diff(self):
        try0s_attempts = AttemptLog.objects.filter(
            masterylog_id__in=[user_tries[0].id for user_tries in self.user_tries]
        )
        try1s_attempts = AttemptLog.objects.filter(
            masterylog_id__in=[
                user_tries[1].id
                for user_tries in self.user_tries
                if len(user_tries) > 1
            ]
        )
        diff_qs = attempts_diff(try0s_attempts, try1s_attempts)
        results = diff_qs.values_list("user", "diff__correct")
        self.assertEqual(len(try0s_attempts), len(results))

        for user_id, diff in results:
            self.assertAttemptCorrectDiff(user_id, diff)

    def test_attempts_diff_takes_right_attempt_of_equal_end_timestamp(self):
        current_try, previous_try = self.user_tries[3]
        item = self.items[self.content_ids[1]][0]
        wrong_attempt = previous_try.attemptlogs.get(item=item)
        previous_try.attemptlogs.filter(pk=wrong_attempt.pk).update(correct=0)
        self._create_attempt(previous_try, item, 1, wrong_attempt.end_timestamp)
        current_try.attemptlogs.filter(item=item).update(correct=1)

        diff = attempts_diff(
            current_try.attemptlogs.filter(item=item),
            previous_try.attemptlogs.all(),
        ).values_list("diff__correct", flat=True)

        self.assertEqual([0], list(diff))
