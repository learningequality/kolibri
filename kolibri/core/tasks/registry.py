import logging
from functools import update_wrapper
from importlib import import_module

from django.apps import apps
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from kolibri.core.tasks.constants import DEFAULT_QUEUE
from kolibri.core.tasks.constants import Priority
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.main import job_storage
from kolibri.core.tasks.permissions import BasePermission
from kolibri.core.tasks.utils import callable_to_import_path
from kolibri.core.tasks.validation import JobValidator


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

    __initialized = False

    def __init_check(self):
        if not self.__initialized:
            self._initialize()
            self.__initialized = True

    def __getitem__(self, key):
        self.__init_check()
        return super(_registry, self).__getitem__(key)

    def __contains__(self, key):
        self.__init_check()
        return super(_registry, self).__contains__(key)

    def __iter__(self):
        self.__init_check()
        return super(_registry, self).__iter__()

    def __len__(self):
        self.__init_check()
        return super(_registry, self).__len__()

    def __repr__(self):
        self.__init_check()
        return super(_registry, self).__repr__()

    def copy(self):
        self.__init_check()
        return super(_registry, self).copy()

    def has_key(self, key):
        return key in self

    def keys(self):
        self.__init_check()
        return super(_registry, self).keys()

    def values(self):
        self.__init_check()
        return super(_registry, self).values()

    def items(self):
        self.__init_check()
        return super(_registry, self).items()

    def __cmp__(self, other):
        self.__init_check()
        return super(_registry, self).__cmp__(other)

    def _initialize(self):
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
        funcstring = callable_to_import_path(registered_task)
        self[funcstring] = registered_task
        logger.debug("Successfully registered '%s' as task.", funcstring)

    def __setitem__(self, key, value):
        if not isinstance(value, RegisteredTask):
            raise TypeError("Value must be an instance of RegisteredTask")
        return super(_registry, self).__setitem__(key, value)

    def update(self, other):
        # Coerce args to a dict and then set each key in that dict
        other = {}.update(other)
        for key, value in other.items():
            self[key] = value

    def validate_task(self, task):
        if not isinstance(task, str):
            raise serializers.ValidationError("The task type must be a string.")
        if task not in self:
            raise serializers.ValidationError(
                "{} is not a registered task - is it in a tasks module of an installed app?".format(
                    task
                )
            )
        return self[task]


TaskRegistry = _registry()


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

    def __init__(  # noqa: C901
        self,
        func,
        job_id=None,
        queue=DEFAULT_QUEUE,
        validator=JobValidator,
        priority=Priority.REGULAR,
        cancellable=False,
        track_progress=False,
        permission_classes=None,
        long_running=False,
        status_fn=None,
    ):
        """
        :param func: Function to be wrapped as a Registered task
        :type func: function
        :param job_id: Fixed job_id to use for any job run from this task, defaults to None
        :type job_id: str
        :param queue: The queue to run this task in by default, defaults to DEFAULT_QUEUE
        :type queue: str
        :param validator: The job validator, used to validate and serialize JSON into
        the args, kwargs, and job arguments for running a job of this task,
        defaults to JobValidator
        :type validator: JobValidator
        :param priority: The priority for this task, can be either HIGH or REGULAR,
        defaults to Priority.REGULAR
        :type priority: int
        :param cancellable: Can this task be cancelled while running, defaults to False
        :type cancellable: bool
        :param track_progress: Does this task track progress while it's executing, defaults to False
        :type track_progress: bool
        :param permission_classes: Classes that determine if a user has read and write access to
        jobs of this task, defaults to None
        :type permission_classes: list of BasePermission derived classes or
        instantiated BasePermission derived classes.
        :param long_running: In regular operation should this task finish in under ten minutes,
        defaults to False
        :type long_running: bool
        :param status_fn: A function that takes a job object as its only argument and returns
        text describing the status of the job to an end user. Should use string wrapping, as it will
        usually be invoked in a context where internationalization is being used.
        :type status_fn: function
        """
        if permission_classes is None:
            permission_classes = []
        if not issubclass(validator, JobValidator):
            raise TypeError("Validators must be a subclass of {}".format(JobValidator))
        if priority not in Priority.Priorities:
            raise ValueError("priority must be one of '5' or '10' (integer).")
        if not isinstance(permission_classes, list):
            raise TypeError("permission_classes must be of list type.")
        if not isinstance(queue, str):
            raise TypeError("queue must be of string type.")
        if not isinstance(cancellable, bool):
            raise TypeError("cancellable must be of bool type.")
        if not isinstance(track_progress, bool):
            raise TypeError("track_progress must be of bool type.")
        if not isinstance(long_running, bool):
            raise TypeError("long_running must be of bool type.")
        if status_fn is not None and not callable(status_fn):
            raise TypeError("status_fn must be callable.")
        if long_running and status_fn is None:
            raise ValueError(
                "When long_running is set to True, status_fn must be defined"
            )
        if priority <= Priority.HIGH and status_fn is None:
            raise ValueError(
                "High priority tasks must specify a status_fn to inform the user of why it is important"
            )

        self.func = func
        self.validator = validator
        self.priority = priority
        self.queue = queue

        self.permissions = list(self._validate_permissions_classes(permission_classes))

        self.job_id = job_id
        self.cancellable = cancellable
        self.track_progress = track_progress
        self.long_running = long_running
        self._status_fn = status_fn

        # Make this wrapper object look seamlessly like the wrapped function
        update_wrapper(self, func)

    def __call__(self, *args, **kwargs):
        return self.func(*args, **kwargs)

    def __repr__(self):
        return "<RegisteredJob: {func}>".format(func=self.func)

    @property
    def func_string(self):
        return callable_to_import_path(self)

    def _validate_permissions_classes(self, permission_classes):
        for permission_class in permission_classes:
            if not isinstance(permission_class, BasePermission) and not issubclass(
                permission_class, BasePermission
            ):
                raise TypeError(
                    "permission_classes must all inherit from {}.".format(
                        BasePermission
                    )
                )
            if isinstance(permission_class, type):
                yield permission_class()
            else:
                yield permission_class

    def check_job_permissions(self, user, job, view):
        for permission in self.permissions:
            if not permission.has_permission(user, job, view):
                raise PermissionDenied

    def validate_job_data(self, user, data):
        # Run validator with `user` and `data` as its argument.
        if "type" not in data:
            data["type"] = self.func_string
        validator = self.validator(data=data, context={"user": user})
        validator.is_valid(raise_exception=True)
        validated_data = validator.validated_data
        enqueue_args_validated_data = validated_data.pop("enqueue_args")

        try:
            job = self._ready_job(**validated_data)
        except TypeError:
            raise serializers.ValidationError(
                "Invalid job data returned from validator."
            )

        return job, enqueue_args_validated_data

    def cancel_all(self):
        return job_storage.cancel_jobs(func=self.func_string)

    def enqueue(self, job=None, retry_interval=None, priority=None, **job_kwargs):
        """
        Enqueue the function with arguments passed to this method.

        :return: enqueued job's id.
        """
        return job_storage.enqueue_job(
            job or self._ready_job(**job_kwargs),
            queue=self.queue,
            priority=priority or self.priority,
            retry_interval=retry_interval,
        )

    def enqueue_lifo(self, job=None, retry_interval=None, priority=None, **job_kwargs):
        """
        Enqueue the function with arguments passed to this method using LIFO order.

        :return: enqueued job's id.
        """
        return job_storage.enqueue_lifo(
            job or self._ready_job(**job_kwargs),
            queue=self.queue,
            priority=priority or self.priority,
            retry_interval=retry_interval,
        )

    def enqueue_if_not(
        self, job=None, retry_interval=None, priority=None, **job_kwargs
    ):
        """
        Enqueue the function with arguments passed to this method if a job of this type is not already enqueued.

        :return: enqueued job's id.
        """
        return job_storage.enqueue_job_if_not_enqueued(
            job or self._ready_job(**job_kwargs),
            queue=self.queue,
            priority=priority or self.priority,
            retry_interval=retry_interval,
        )

    def enqueue_in(
        self,
        delta_time,
        interval=0,
        repeat=0,
        retry_interval=None,
        job=None,
        priority=None,
        **job_kwargs
    ):
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
            priority=priority or self.priority,
            interval=interval,
            repeat=repeat,
            retry_interval=retry_interval,
        )

    def enqueue_at(
        self,
        datetime,
        interval=0,
        repeat=0,
        retry_interval=None,
        job=None,
        priority=None,
        **job_kwargs
    ):
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
            priority=priority or self.priority,
            interval=interval,
            repeat=repeat,
            retry_interval=retry_interval,
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
            long_running=job_kwargs.pop("long_running", self.long_running),
            **job_kwargs
        )
        return job_obj

    def generate_status(self, job):
        """
        Takes a job object and returns text describing the current status for a user.
        Relies on the task having registered a status_fn, otherwise this will
        return None.

        Otherwise it should return an object of type JobStatus, defined in the job module.
        """
        if self._status_fn:
            return self._status_fn(job)
