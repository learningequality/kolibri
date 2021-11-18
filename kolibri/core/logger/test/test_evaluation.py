from django.test import TestCase

from .helpers import EvaluationMixin
from kolibri.core.logger.evaluation import attempts_diff
from kolibri.core.logger.evaluation import find_previous_tries
from kolibri.core.logger.evaluation import find_previous_tries_attempts
from kolibri.core.logger.evaluation import get_previous_try
from kolibri.core.logger.evaluation import get_try_for_user
from kolibri.core.logger.evaluation import try_diff
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import MasteryLog


class EvaluationTestCase(EvaluationMixin, TestCase):
    def test_get_try_for_user(self):
        for user_index, user in enumerate(self.users):
            for try_index, user_try in enumerate(self.user_tries[user_index]):
                for content_index, content_id in enumerate(self.content_ids):
                    actual_try = get_try_for_user(content_id, user, try_index=try_index)
                    if user_index % 2 == content_index:
                        self.assertIsNotNone(
                            actual_try,
                            "Try missing for user {}, content {}, try {}".format(
                                user_index, content_index, try_index
                            ),
                        )
                        self.assertEqual(
                            user_try.id,
                            actual_try.id,
                            "Try does not match for user {}, content {}, try {}".format(
                                user_index, content_index, try_index
                            ),
                        )
                    else:
                        self.assertIsNone(actual_try)

    def test_get_previous_try(self):
        for user_index, user in enumerate(self.users):
            user_tries = self.user_tries[user_index]
            try0 = user_tries[0]
            try1 = None if len(user_tries) < 2 else user_tries[1]

            previous_try = get_previous_try(try0)
            self.assertEqual(try1, previous_try)

    def test_find_previous_tries(self):
        try0s = MasteryLog.objects.filter(
            id__in=[user_tries[0].id for user_tries in self.user_tries]
        )
        expected_try1s = [
            user_tries[1] for user_tries in self.user_tries if len(user_tries) > 1
        ]
        actual_try1s = list(find_previous_tries(try0s))
        self.assertEqual(len(expected_try1s), len(actual_try1s))
        for actual_try in actual_try1s:
            self.assertIn(actual_try, expected_try1s)

    def test_find_previous_tries_attempts(self):
        try0s_attempts = AttemptLog.objects.filter(
            masterylog_id__in=[user_tries[0].id for user_tries in self.user_tries]
        )
        expected_try1s_attempts = list(
            AttemptLog.objects.filter(
                masterylog_id__in=[
                    user_tries[1].id
                    for user_tries in self.user_tries
                    if len(user_tries) > 1
                ]
            )
        )
        actual_try1s_attempts = list(find_previous_tries_attempts(try0s_attempts))
        self.assertEqual(len(expected_try1s_attempts), len(actual_try1s_attempts))
        for actual_try in actual_try1s_attempts:
            self.assertIn(actual_try, expected_try1s_attempts)

    def test_try_diff(self):
        self.assertIsNone(try_diff(*self.user_tries[0]))
        self.assertIsNone(try_diff(*self.user_tries[1]))
        self.assertEqual(
            try_diff(*self.user_tries[2]),
            {
                "correct": 0.0,
                "time_spent": -30 * 60,
            },
        )
        self.assertEqual(
            try_diff(*self.user_tries[3]),
            {
                "correct": -3.0,
                "time_spent": -30 * 60,
            },
        )
        self.assertEqual(
            try_diff(*self.user_tries[4]),
            {
                "correct": 3.0,
                "time_spent": -30 * 60,
            },
        )
        self.assertEqual(
            try_diff(*self.user_tries[5]),
            {
                "correct": 0.0,
                "time_spent": -30 * 60,
            },
        )

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
