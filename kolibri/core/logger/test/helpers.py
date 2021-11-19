import datetime
import uuid
from random import randint

from django.utils import timezone

from .factory_logger import ContentSessionLogFactory
from .factory_logger import ContentSummaryLogFactory
from .factory_logger import FacilityUserFactory
from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.logger.api import MIN_INTEGER
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import MasteryLog


class EvaluationMixin(object):
    """
    try0: most recent try
    try1: previous try

    | user | try0      | try1      |
    | ---- | --------- | --------- |
    | 0    | Correct   | None      |
    | 1    | Incorrect | None      |
    | 2    | Correct   | Correct   |
    | 3    | Incorrect | Correct   |
    | 4    | Correct   | Incorrect |
    | 5    | Incorrect | Incorrect |
    """

    fixtures = ["content_test.json"]

    @classmethod
    def setUpTestData(cls):
        super(EvaluationMixin, cls).setUpTestData()
        cls.facility = FacilityFactory.create()
        cls.users = [
            FacilityUserFactory.create(facility=cls.facility) for _ in range(6)
        ]
        cls.users_map = {user.id: user for user in cls.users}
        cls.superuser = create_superuser(cls.facility)

        cls.content_ids = [uuid.uuid4().hex for _ in range(2)]

        cls.items = {
            content_id: [uuid.uuid4().hex for _ in range(3)]
            for content_id in cls.content_ids
        }

        cls.summary_logs = [
            [
                ContentSummaryLogFactory.create(
                    user=user,
                    content_id=content_id,
                    channel_id="6199dde695db4ee4ab392222d5af1e5c",
                )
                for content_id in cls.content_ids
            ]
            for user in cls.users
        ]

        cls.session_logs = [
            [
                ContentSessionLogFactory.create(
                    user=user,
                    content_id=content_id,
                    channel_id="6199dde695db4ee4ab392222d5af1e5c",
                )
                for content_id in cls.content_ids
            ]
            for user in cls.users
        ]

        cls.user_tries = [
            cls._create_tries(0, try0_correct=True, try1_correct=None),
            cls._create_tries(1, try0_correct=False, try1_correct=None),
            cls._create_tries(2, try0_correct=True, try1_correct=True),
            cls._create_tries(3, try0_correct=False, try1_correct=True),
            cls._create_tries(4, try0_correct=True, try1_correct=False),
            cls._create_tries(5, try0_correct=False, try1_correct=False),
        ]

    @classmethod
    def _create_tries(cls, user_index, try0_correct=False, try1_correct=None):
        tries = []
        try0_end = timezone.now()
        tries.append(cls._create_try(user_index, try0_correct, try0_end))

        if try1_correct is not None:
            try1_end = try0_end - datetime.timedelta(minutes=120)
            tries.append(
                cls._create_try(user_index, try1_correct, try1_end, duration=60)
            )

        return tries

    @classmethod
    def _create_try(cls, user_index, correct, end_timestamp, duration=30):
        user = cls.users[user_index]
        try_start = end_timestamp - datetime.timedelta(minutes=duration)
        try_log = MasteryLog.objects.create(
            user=user,
            summarylog=cls.summary_logs[user_index][user_index % 2],
            start_timestamp=try_start,
            end_timestamp=end_timestamp,
            completion_timestamp=end_timestamp,
            complete=True,
            mastery_level=randint(MIN_INTEGER, -1),
        )

        for i in range(3):
            start_offset = datetime.timedelta(minutes=5 + (i * 5))
            end_offset = start_offset + datetime.timedelta(minutes=5)
            AttemptLog.objects.create(
                masterylog=try_log,
                user=user,
                sessionlog=cls.session_logs[user_index][user_index % 2],
                item=cls.items[cls.content_ids[user_index % 2]][i],
                start_timestamp=try_start + start_offset,
                end_timestamp=try_start + end_offset,
                completion_timestamp=try_start + end_offset,
                correct=1 if correct else 0,
            )

        return try_log

    def assertAttemptCorrectDiff(self, user_id, diff):
        user_index = self.users.index(self.users_map[user_id])
        if user_index in (0, 1):
            self.assertIsNone(diff)
        elif user_index in (2, 5):
            self.assertEqual(0.0, diff)
        elif user_index == 3:
            self.assertEqual(-1.0, diff)
        elif user_index == 4:
            self.assertEqual(1.0, diff)

    def assertAttemptDiffs(self, attempt_logs, content_mod=None):
        for attempt_log in attempt_logs:
            user_index = self.users.index(self.users_map[attempt_log["user"]])
            if content_mod is not None:
                self.assertEqual(user_index % 2, content_mod)
            diff = attempt_log.get("diff")
            self.assertIsNotNone(diff)
            diff_correct = diff.get("correct")
            self.assertAttemptCorrectDiff(attempt_log["user"], diff_correct)
