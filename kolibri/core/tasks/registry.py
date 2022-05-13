import logging
from functools import update_wrapper
from importlib import import_module

from django.apps import apps
from django.utils.functional import SimpleLazyObject
from rest_framework import serializers
from six import string_types

from kolibri.core.tasks.constants import DEFAULT_QUEUE
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.main import job_storage
from kolibri.core.tasks.utils import stringify_func

logger = logging.getLogger(__name__)


class _registry(dict):
    """
    All jobs that get registered via `register_task` decorator are placed
    in this registry.

    It gets populated lazily, with jobs being imported as they are looked up.

    This registry's key is the stringified form of decorated function and value
    is an instance of `RegisteredJob`. For example,

        {
            ...
            "kolibri.core.content.tasks.importchannel": <RegisteredJob>,
            "kolibri.core.content.tasks.exportchannel": <RegisteredJob>,
            ...
        }
    """

    def __init__(self):
        logger.debug("Importing 'tasks' module from django apps")

        for app_config in apps.get_app_configs():
            try:
                module = import_module(".tasks", app_config.module.__name__)
                for cls in module.__dict__.values():
                    if isinstance(cls, RegisteredTask):
                        self._register_task(cls)
            except ImportError:
                pass

    def _register_task(self, registered_task):
        funcstring = stringify_func(registered_task)
        self[funcstring] = registered_task
        logger.debug("Successfully registered '%s' as task.", funcstring)

    def __setitem__(self, key, value):
        if not isinstance(value, RegisteredTask):
            raise TypeError("Value must be an instance of RegisteredJob")
        return super(_registry, self).__setitem__(key, value)

    def update(self, other):
        # Coerce args to a dict and then set each key in that dict
        other = {}.update(other)
        for key, value in other.items():
            self[key] = value

    def validate_task(self, task):
        if not isinstance(task, string_types):
            raise serializers.ValidationError("The 'task' value must be a string.")
        if task not in self:
            raise serializers.ValidationError(
                "{} is not a registered task - is it in a tasks module of an installed app?".format(
                    task
                )
            )
        return self[task]


TaskRegistry = SimpleLazyObject(_registry)


class RegisteredTask(object):
    """
    This class acts as a transparent wrapper around the `func` argument.

    For example, if `add` is registered as:

        @register_task(priority=Priority.HIGH, cancellable=True)
        def add(x, y):
            return x + y

        Then, we can enqueue `add` by calling `add.enqueue(args=(4, 2))`.

        Also, we can schedule `add` by calling `add.enqueue_in(timedelta(1), args=(4, 2))`
        or `add.enqueue_at(datetime.now(), args=(4, 2))`.

        Look at each method's docstring for more info.
    """

    def __init__(
        self,
        func,
        job_id=None,
        queue=DEFAULT_QUEUE,
        validator=None,
        priority=Priority.REGULAR,
        cancellable=False,
        track_progress=False,
        permission_classes=None,
    ):
        if permission_classes is None:
            permission_classes = []
        if validator is not None and not callable(validator):
            raise TypeError("Can't assign validator of type {}".format(type(validator)))
        if priority not in Priority.Priorities:
            raise ValueError("priority must be one of '5' or '10' (integer).")
        if not isinstance(permission_classes, list):
            raise TypeError("permission_classes must be of list type.")
        if not isinstance(queue, string_types):
            raise TypeError("queue must be of string type.")
        if not isinstance(cancellable, bool):
            raise TypeError("cancellable must be of bool type.")
        if not isinstance(track_progress, bool):
            raise TypeError("track_progress must be of bool type.")

        self.func = func
        self.validator = validator
        self.priority = priority
        self.queue = queue

        self.permissions = [perm() for perm in permission_classes]

        self.job_id = job_id
        self.cancellable = cancellable
        self.track_progress = track_progress

        # Make this wrapper object look seamlessly like the wrapped function
        update_wrapper(self, func)

    def __call__(self, *args, **kwargs):
        return self.func(*args, **kwargs)

    def __repr__(self):
        return "<RegisteredJob: {func}>".format(func=self.func)

    def enqueue(self, job=None, **job_kwargs):
        """
        Enqueue the function with arguments passed to this method.

        :return: enqueued job's id.
        """
        return job_storage.enqueue_job(
            job or self._ready_job(**job_kwargs),
            queue=self.queue,
            priority=self.priority,
        )

    def enqueue_in(self, delta_time, interval=0, repeat=0, job=None, **job_kwargs):
        """
        Schedule the function to get enqueued in `delta_time` with args and
        kwargs as its positional and keyword arguments.

        Repeat of None with a specified interval means the job will repeat
        forever at that interval.

        :return: scheduled job's id.
        """
        return job_storage.enqueue_in(
            delta_time,
            job or self._ready_job(**job_kwargs),
            queue=self.queue,
            priority=self.priority,
            interval=interval,
            repeat=repeat,
        )

    def enqueue_at(self, datetime, interval=0, repeat=0, job=None, **job_kwargs):
        """
        Schedule the function to get enqueued at a specific `datetime` with
        args and kwargs as its positional and keyword arguments.

        Repeat of None with a specified interval means the job will repeat
        forever at that interval.

        :return: scheduled job's id.
        """
        return job_storage.enqueue_at(
            datetime,
            job or self._ready_job(**job_kwargs),
            queue=self.queue,
            priority=self.priority,
            interval=interval,
            repeat=repeat,
        )

    def _ready_job(self, **job_kwargs):
        """
        Returns a job object with args and kwargs as its positional and keyword arguments.
        """
        job_obj = Job(
            self,
            job_id=job_kwargs.pop("job_id", self.job_id),
            cancellable=job_kwargs.pop("cancellable", self.cancellable),
            track_progress=job_kwargs.pop("track_progress", self.track_progress),
            **job_kwargs
        )
        return job_obj
