from datetime import datetime
from datetime import timedelta

import mock
from django.test.testcases import TestCase

from kolibri.core.tasks.constants import Priority
from kolibri.core.tasks.exceptions import JobNotRunning
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.permissions import IsSuperAdmin
from kolibri.core.tasks.registry import RegisteredTask
from kolibri.core.tasks.utils import current_state_tracker
from kolibri.core.tasks.validation import JobValidator


def status_fn(job):
    pass


class JobTest(TestCase):
    def setUp(self):
        self.job = Job(id, track_progress=True)
        self.job.storage = mock.MagicMock()

    def test_job_save_as_cancellable(self):
        cancellable = not self.job.cancellable

        self.job.save_as_cancellable(cancellable=cancellable)
        self.job.storage.save_job_as_cancellable.assert_called_once_with(
            self.job.job_id, cancellable=cancellable
        )

    def test_job_save_as_cancellable_sets_cancellable(self):
        cancellable = not self.job.cancellable

        self.job.save_as_cancellable(cancellable=cancellable)
        self.assertEqual(self.job.cancellable, cancellable)

    def test_job_update_progress_saves_progress_to_storage(self):
        self.job.update_progress(0.5, 1.5)
        self.job.storage.update_job_progress.assert_called_once_with(
            self.job.job_id, 0.5, 1.5
        )

    def test_job_update_progress_sets_progress(self):
        self.job.update_progress(0.5, 1.5)
        self.assertEqual(self.job.progress, 0.5)
        self.assertEqual(self.job.total_progress, 1.5)

    def test_job_save_as_cancellable__skip(self):
        cancellable = self.job.cancellable
        self.job.save_as_cancellable(cancellable=cancellable)
        self.job.storage.save_job_as_cancellable.assert_not_called()

    def test_job_save_as_cancellable__no_storage(self):
        cancellable = not self.job.cancellable
        self.job.storage = None
        with self.assertRaises(ReferenceError):
            self.job.save_as_cancellable(cancellable=cancellable)

    def test_job_retry_in_not_running(self):
        dt = timedelta(seconds=15)
        with self.assertRaises(JobNotRunning):
            self.job.retry_in(dt)

    def test_job_retry_in_running(self):
        setattr(current_state_tracker, "job", self.job)
        dt = timedelta(seconds=15)
        try:
            self.job.retry_in(dt)
            self.assertEqual(self.job._retry_in_delay, dt)
            self.assertEqual({}, self.job._retry_in_kwargs)
        except Exception:
            setattr(current_state_tracker, "job", None)

    def test_job_retry_in_unexpected_keyword_argument(self):
        setattr(current_state_tracker, "job", self.job)
        dt = timedelta(seconds=15)
        kwargs = {"invalid_arg": "value"}
        with self.assertRaises(ValueError):
            self.job.retry_in(dt, **kwargs)
        setattr(current_state_tracker, "job", None)

    def test_job_retry_in_with_priority(self):
        setattr(current_state_tracker, "job", self.job)
        dt = timedelta(seconds=15)
        kwargs = {"priority": Priority.LOW}
        try:
            self.job.retry_in(dt, **kwargs)
            self.assertEqual(self.job._retry_in_delay, dt)
            self.assertEqual(kwargs, self.job._retry_in_kwargs)
        except Exception:
            setattr(current_state_tracker, "job", None)

    def test_job_retry_in_with_repeat(self):
        setattr(current_state_tracker, "job", self.job)
        dt = timedelta(seconds=15)
        kwargs = {"repeat": 3}
        try:
            self.job.retry_in(dt, **kwargs)
            self.assertEqual(self.job._retry_in_delay, dt)
            self.assertEqual(kwargs, self.job._retry_in_kwargs)
        except Exception:
            setattr(current_state_tracker, "job", None)

    def test_job_retry_in_with_interval(self):
        setattr(current_state_tracker, "job", self.job)
        dt = timedelta(seconds=15)
        kwargs = {"interval": 5 * 60}
        try:
            self.job.retry_in(dt, **kwargs)
            self.assertEqual(self.job._retry_in_delay, dt)
            self.assertEqual(kwargs, self.job._retry_in_kwargs)
        except Exception:
            setattr(current_state_tracker, "job", None)

    def test_job_retry_in_with_retry_interval(self):
        setattr(current_state_tracker, "job", self.job)
        dt = timedelta(seconds=15)
        kwargs = {"retry_interval": 60 * 60}
        try:
            self.job.retry_in(dt, **kwargs)
            self.assertEqual(self.job._retry_in_delay, dt)
            self.assertEqual(kwargs, self.job._retry_in_kwargs)
        except Exception:
            setattr(current_state_tracker, "job", None)

    def test_job_retry_in_invalid_priority(self):
        setattr(current_state_tracker, "job", self.job)
        dt = timedelta(seconds=15)
        invalid_priority = "invalid_priority"
        kwargs = {"priority": invalid_priority}
        with self.assertRaises(ValueError):
            self.job.retry_in(dt, **kwargs)
        setattr(current_state_tracker, "job", None)

    def test_job_retry_in_invalid_interval(self):
        setattr(current_state_tracker, "job", self.job)
        dt = timedelta(seconds=15)
        invalid_interval = -1  # Invalid negative interval
        kwargs = {"interval": invalid_interval}
        with self.assertRaises(ValueError):
            self.job.retry_in(dt, **kwargs)
        setattr(current_state_tracker, "job", None)

    def test_job_retry_in_invalid_retry_interval(self):
        setattr(current_state_tracker, "job", self.job)
        dt = timedelta(seconds=15)
        invalid_retry_interval = 0  # Invalid zero retry interval
        kwargs = {"retry_interval": invalid_retry_interval}
        with self.assertRaises(ValueError):
            self.job.retry_in(dt, **kwargs)
        setattr(current_state_tracker, "job", None)

    def test_job_retry_in_invalid_repeat(self):
        setattr(current_state_tracker, "job", self.job)
        dt = timedelta(seconds=15)
        invalid_repeat = -1  # Invalid negative repeat
        kwargs = {"repeat": invalid_repeat}
        with self.assertRaises(ValueError):
            self.job.retry_in(dt, **kwargs)
        setattr(current_state_tracker, "job", None)

    def test_job_retry_in_all_allowable_values(self):
        setattr(current_state_tracker, "job", self.job)
        dt = timedelta(seconds=15)
        priority = Priority.HIGH
        interval = 60 * 5
        retry_interval = 60 * 60
        repeat = 3
        kwargs = {
            "priority": priority,
            "interval": interval,
            "retry_interval": retry_interval,
            "repeat": repeat,
        }
        try:
            self.job.retry_in(dt, **kwargs)
            self.assertEqual(self.job._retry_in_delay, dt)
            self.assertEqual(kwargs, self.job._retry_in_kwargs)
        except Exception:
            setattr(current_state_tracker, "job", None)


class TestRegisteredTask(TestCase):
    def setUp(self):
        self.registered_task = RegisteredTask(
            int,
            priority=Priority.HIGH,
            queue="test",
            permission_classes=[IsSuperAdmin],
            job_id="test",
            cancellable=True,
            track_progress=True,
            long_running=True,
            status_fn=status_fn,
        )

    def test_constructor_sets_required_params(self):
        self.assertEqual(self.registered_task.func, int)
        self.assertEqual(self.registered_task.validator, JobValidator)
        self.assertEqual(self.registered_task.priority, Priority.HIGH)
        self.assertIsInstance(self.registered_task.permissions[0], IsSuperAdmin)
        self.assertEqual(self.registered_task.job_id, "test")
        self.assertEqual(self.registered_task.queue, "test")
        self.assertEqual(self.registered_task.cancellable, True)
        self.assertEqual(self.registered_task.track_progress, True)
        self.assertEqual(self.registered_task.long_running, True)

    @mock.patch("kolibri.core.tasks.registry.Job", spec=True)
    def test__ready_job(self, MockJob):
        result = self.registered_task._ready_job(args=("10",), kwargs=dict(base=10))

        MockJob.assert_called_once_with(
            self.registered_task,
            args=("10",),  # arg that was passed to _ready_job()
            job_id="test",
            cancellable=True,
            track_progress=True,
            long_running=True,
            kwargs=dict(base=10),  # kwarg that was passed to _ready_job()
        )

        # Do we return the job object?
        self.assertIsInstance(result, Job)

    @mock.patch("kolibri.core.tasks.registry.RegisteredTask._ready_job")
    @mock.patch("kolibri.core.tasks.registry.job_storage")
    def test_enqueue_in(self, mock_job_storage, _ready_job_mock):
        args = ("10",)
        kwargs = dict(base=10)

        _ready_job_mock.return_value = "job"

        delta = timedelta(seconds=5)

        self.registered_task.enqueue_in(
            delta_time=delta,
            interval=10,
            repeat=10,
            args=args,
            kwargs=kwargs,
        )

        _ready_job_mock.assert_called_once_with(args=args, kwargs=kwargs)
        mock_job_storage.enqueue_in.assert_called_once_with(
            delta,
            "job",
            queue="test",
            interval=10,
            priority=5,
            repeat=10,
            retry_interval=None,
        )

    @mock.patch("kolibri.core.tasks.registry.RegisteredTask._ready_job")
    @mock.patch("kolibri.core.tasks.registry.job_storage")
    def test_enqueue_in__override_priority(self, mock_job_storage, _ready_job_mock):
        args = ("10",)
        kwargs = dict(base=10)

        _ready_job_mock.return_value = "job"

        override_priority = 20
        self.assertNotEqual(self.registered_task.priority, override_priority)
        delta = timedelta(seconds=5)

        self.registered_task.enqueue_in(
            delta_time=delta,
            interval=10,
            repeat=10,
            args=args,
            priority=override_priority,
            kwargs=kwargs,
        )

        _ready_job_mock.assert_called_once_with(args=args, kwargs=kwargs)
        mock_job_storage.enqueue_in.assert_called_once_with(
            delta,
            "job",
            queue="test",
            interval=10,
            priority=override_priority,
            repeat=10,
            retry_interval=None,
        )

    @mock.patch("kolibri.core.tasks.registry.RegisteredTask._ready_job")
    @mock.patch("kolibri.core.tasks.registry.job_storage")
    def test_enqueue_at(self, mock_job_storage, _ready_job_mock):
        args = ("10",)
        kwargs = dict(base=10)

        _ready_job_mock.return_value = "job"

        now = datetime.now()

        self.registered_task.enqueue_at(
            datetime=now,
            interval=10,
            repeat=10,
            args=args,
            kwargs=kwargs,
        )

        _ready_job_mock.assert_called_once_with(args=args, kwargs=kwargs)
        mock_job_storage.enqueue_at.assert_called_once_with(
            now,
            "job",
            queue="test",
            interval=10,
            priority=5,
            repeat=10,
            retry_interval=None,
        )

    @mock.patch("kolibri.core.tasks.registry.RegisteredTask._ready_job")
    @mock.patch("kolibri.core.tasks.registry.job_storage")
    def test_enqueue_at__override_priority(self, mock_job_storage, _ready_job_mock):
        args = ("10",)
        kwargs = dict(base=10)

        _ready_job_mock.return_value = "job"

        now = datetime.now()

        override_priority = 20
        self.assertNotEqual(self.registered_task.priority, override_priority)

        self.registered_task.enqueue_at(
            datetime=now,
            interval=10,
            repeat=10,
            priority=override_priority,
            args=args,
            kwargs=kwargs,
        )

        _ready_job_mock.assert_called_once_with(args=args, kwargs=kwargs)
        mock_job_storage.enqueue_at.assert_called_once_with(
            now,
            "job",
            queue="test",
            interval=10,
            priority=override_priority,
            repeat=10,
            retry_interval=None,
        )

    @mock.patch("kolibri.core.tasks.registry.RegisteredTask._ready_job")
    @mock.patch("kolibri.core.tasks.registry.job_storage")
    def test_enqueue(self, job_storage_mock, _ready_job_mock):
        args = ("10",)
        kwargs = dict(base=10)

        _ready_job_mock.return_value = "job"

        self.registered_task.enqueue(args=args, kwargs=kwargs)

        _ready_job_mock.assert_called_once_with(args=args, kwargs=kwargs)
        job_storage_mock.enqueue_job.assert_called_once_with(
            "job",
            queue=self.registered_task.queue,
            priority=self.registered_task.priority,
            retry_interval=None,
        )

    @mock.patch("kolibri.core.tasks.registry.RegisteredTask._ready_job")
    @mock.patch("kolibri.core.tasks.registry.job_storage")
    def test_enqueue_lifo_job(self, job_storage_mock, _ready_job_mock):
        args = ("10",)
        kwargs = dict(base=10)

        _ready_job_mock.return_value = "lifo_job"

        self.registered_task.enqueue_lifo(args=args, kwargs=kwargs)

        _ready_job_mock.assert_called_once_with(args=args, kwargs=kwargs)
        job_storage_mock.enqueue_lifo.assert_called_once_with(
            "lifo_job",
            queue=self.registered_task.queue,
            priority=self.registered_task.priority,
            retry_interval=None,
        )

    @mock.patch("kolibri.core.tasks.registry.RegisteredTask._ready_job")
    @mock.patch("kolibri.core.tasks.registry.job_storage")
    def test_enqueue__override_priority(self, job_storage_mock, _ready_job_mock):
        args = ("10",)
        kwargs = dict(base=10)

        _ready_job_mock.return_value = "job"

        override_priority = 20
        self.assertNotEqual(self.registered_task.priority, override_priority)
        self.registered_task.enqueue(
            args=args, kwargs=kwargs, priority=override_priority
        )

        _ready_job_mock.assert_called_once_with(args=args, kwargs=kwargs)
        job_storage_mock.enqueue_job.assert_called_once_with(
            "job",
            queue=self.registered_task.queue,
            priority=override_priority,
            retry_interval=None,
        )
