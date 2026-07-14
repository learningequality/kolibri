from datetime import datetime
from datetime import timedelta
from unittest import mock

from kolibri.core.tasks.schedules import Cron
from kolibri.core.tasks.schedules import DAY
from kolibri.core.tasks.schedules import Enqueue
from kolibri.core.tasks.schedules import EnqueueIn
from kolibri.core.tasks.schedules import HOUR
from kolibri.core.tasks.schedules import WEEK


class TestEnqueue:
    def test_forwards_args_kwargs(self):
        task = mock.Mock()
        Enqueue(args=(1, 2), kwargs={"x": 3}).apply(task)
        task.enqueue.assert_called_once_with(args=(1, 2), kwargs={"x": 3})


class TestEnqueueIn:
    def test_forwards_all_params(self):
        task = mock.Mock()
        EnqueueIn(
            timedelta(hours=1),
            interval=HOUR,
            repeat=None,
            retry_interval=60,
            args=(5,),
            kwargs={"x": 1},
        ).apply(task)
        task.enqueue_in.assert_called_once_with(
            timedelta(hours=1),
            interval=HOUR,
            repeat=None,
            retry_interval=60,
            args=(5,),
            kwargs={"x": 1},
        )


class TestCron:
    # Fixed "now": Tuesday 2026-06-30 04:15:30 local time
    # weekday() == 1 (Tuesday)
    FIXED_NOW = datetime(2026, 6, 30, 4, 15, 30)

    def _patch_now(self, dt=None):
        return mock.patch(
            "kolibri.core.tasks.schedules.local_now",
            return_value=dt or self.FIXED_NOW,
        )

    def test_daily_future_hour(self):
        task = mock.Mock()
        with self._patch_now():
            Cron(hour=5).apply(task)
        expected = self.FIXED_NOW.replace(hour=5, minute=0, second=0, microsecond=0)
        task.enqueue_at.assert_called_once_with(
            expected,
            interval=DAY,
            repeat=None,
            retry_interval=None,
            args=(),
            kwargs={},
        )

    def test_daily_past_hour_rolls_to_tomorrow(self):
        task = mock.Mock()
        with self._patch_now():
            # hour=3 is before now (04:00), so must roll to tomorrow
            Cron(hour=3).apply(task)
        expected = self.FIXED_NOW.replace(
            hour=3, minute=0, second=0, microsecond=0
        ) + timedelta(days=1)
        task.enqueue_at.assert_called_once_with(
            expected,
            interval=DAY,
            repeat=None,
            retry_interval=None,
            args=(),
            kwargs={},
        )

    def test_hourly_future_minute(self):
        task = mock.Mock()
        with self._patch_now():
            # minute=30, now is 04:15:30 → next is 04:30
            Cron(minute=30).apply(task)
        expected = self.FIXED_NOW.replace(minute=30, second=0, microsecond=0)
        task.enqueue_at.assert_called_once_with(
            expected,
            interval=HOUR,
            repeat=None,
            retry_interval=None,
            args=(),
            kwargs={},
        )

    def test_hourly_past_minute_rolls_to_next_hour(self):
        task = mock.Mock()
        # now is 04:30, minute=0 is past → next is 05:00
        now = datetime(2026, 6, 30, 4, 30, 0)
        with self._patch_now(now):
            Cron(minute=0).apply(task)
        expected = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        task.enqueue_at.assert_called_once_with(
            expected,
            interval=HOUR,
            repeat=None,
            retry_interval=None,
            args=(),
            kwargs={},
        )

    def test_weekly_future_weekday(self):
        task = mock.Mock()
        # now is Tuesday; Monday (0) is in future (next Monday)
        with self._patch_now():
            Cron(day_of_week=0, hour=3).apply(task)
        # today is Tuesday (weekday=1); Monday (0) is 6 days ahead
        days_ahead = 6
        expected = self.FIXED_NOW.replace(
            hour=3, minute=0, second=0, microsecond=0
        ) + timedelta(days=days_ahead)
        task.enqueue_at.assert_called_once_with(
            expected,
            interval=WEEK,
            repeat=None,
            retry_interval=None,
            args=(),
            kwargs={},
        )

    def test_weekly_same_weekday_past_hour(self):
        task = mock.Mock()
        # now is Tuesday 04:00; Tuesday at 03:00 is past → next Tuesday
        with self._patch_now():
            Cron(day_of_week=1, hour=3).apply(task)
        days_ahead = 7  # same weekday but time passed → skip to next week
        expected = self.FIXED_NOW.replace(
            hour=3, minute=0, second=0, microsecond=0
        ) + timedelta(days=days_ahead)
        task.enqueue_at.assert_called_once_with(
            expected,
            interval=WEEK,
            repeat=None,
            retry_interval=None,
            args=(),
            kwargs={},
        )

    def test_forwards_repeat_retry_interval_args_kwargs(self):
        task = mock.Mock()
        with self._patch_now():
            Cron(
                hour=5, repeat=10, retry_interval=30, args=(1,), kwargs={"a": 2}
            ).apply(task)
        _, kwargs = task.enqueue_at.call_args
        assert kwargs["repeat"] == 10
        assert kwargs["retry_interval"] == 30
        assert kwargs["args"] == (1,)
        assert kwargs["kwargs"] == {"a": 2}
