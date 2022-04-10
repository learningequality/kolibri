from django.test import TestCase

from .helpers import EvaluationMixin
from kolibri.core.logger.evaluation import attempts_diff
from kolibri.core.logger.models import AttemptLog


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
