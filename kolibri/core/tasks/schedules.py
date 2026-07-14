"""
Declarative schedules for registered tasks.

A schedule describes *when* a task should first be enqueued. Tasks declare one
at registration via ``register_task(schedule=…)``; ``TaskRegistry`` applies it
on server start. Each subclass wraps one of the ``enqueue_*`` methods on the
task (see ``kolibri.core.tasks.registry.RegisteredTask``), so the schedule
classes are the declarative front end to that imperative storage API.
"""

from datetime import timedelta

from kolibri.utils.time_utils import local_now

MINUTE = 60
HOUR = 60 * MINUTE
DAY = 24 * HOUR
WEEK = 7 * DAY


class Schedule:
    """
    Base schedule. Holds the args/kwargs the task will be called with; each
    subclass' ``apply`` enqueues the task with its own timing semantics.
    """

    def __init__(self, args=None, kwargs=None):
        self.args = args if args is not None else ()
        self.kwargs = kwargs if kwargs is not None else {}

    def apply(self, task):
        raise NotImplementedError


class Enqueue(Schedule):
    """Enqueue the task once, immediately, on apply."""

    def apply(self, task):
        task.enqueue(args=self.args, kwargs=self.kwargs)


class EnqueueIn(Schedule):
    """
    Enqueue the task ``delta`` from now. ``interval``/``repeat`` make it recur;
    ``retry_interval`` sets the delay before a failed run is retried.
    """

    def __init__(
        self, delta, interval=0, repeat=0, retry_interval=None, args=None, kwargs=None
    ):
        super().__init__(args=args, kwargs=kwargs)
        self.delta = delta
        self.interval = interval
        self.repeat = repeat
        self.retry_interval = retry_interval

    def apply(self, task):
        task.enqueue_in(
            self.delta,
            interval=self.interval,
            repeat=self.repeat,
            retry_interval=self.retry_interval,
            args=self.args,
            kwargs=self.kwargs,
        )


class Cron(Schedule):
    """
    Schedule a task at a calendar-aligned time.

    Fields (set from coarsest to finest): day_of_week (0=Monday), hour, minute.
    Cadence: day_of_week set → WEEK; hour set → DAY; minute set → HOUR.
    """

    def __init__(
        self,
        minute=None,
        hour=None,
        day_of_week=None,
        repeat=None,
        retry_interval=None,
        args=None,
        kwargs=None,
    ):
        super().__init__(args=args, kwargs=kwargs)
        self.minute = minute
        self.hour = hour
        self.day_of_week = day_of_week
        self.repeat = repeat
        self.retry_interval = retry_interval

    def _interval(self):
        if self.day_of_week is not None:
            return WEEK
        if self.hour is not None:
            return DAY
        return HOUR

    def _next_occurrence(self, interval):
        now = local_now()
        candidate = now.replace(
            hour=self.hour if self.hour is not None else now.hour,
            minute=self.minute if self.minute is not None else 0,
            second=0,
            microsecond=0,
        )
        if self.day_of_week is not None:
            days_ahead = (self.day_of_week - now.weekday()) % 7
            candidate = candidate + timedelta(days=days_ahead)

        # A candidate that already passed rolls forward by exactly one cadence.
        if candidate <= now:
            candidate = candidate + timedelta(seconds=interval)

        return candidate

    def apply(self, task):
        interval = self._interval()
        when = self._next_occurrence(interval)
        task.enqueue_at(
            when,
            interval=interval,
            repeat=self.repeat,
            retry_interval=self.retry_interval,
            args=self.args,
            kwargs=self.kwargs,
        )
