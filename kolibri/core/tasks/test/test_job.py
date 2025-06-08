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
            self.job.job_id, 0.5, 1.5, extra_metadata=self.job.extra_metadata
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

    # Test generated by Claude 3.7 Sonnet and tweaked

    def test_job_update_progress_throttles_small_updates(self):
        # Initial progress update
        self.job.update_progress(0.1, 1.0)
        self.job.storage.update_job_progress.assert_called_once_with(
            self.job.job_id, 0.1, 1.0, extra_metadata=self.job.extra_metadata
        )
        self.job.storage.update_job_progress.reset_mock()

        # Small progress update (less than 1% change) should be throttled
        self.job.update_progress(0.105, 1.0)
        self.job.storage.update_job_progress.assert_not_called()

        # Values should be updated locally even if not sent to storage
        self.assertEqual(self.job.progress, 0.105)
        self.assertEqual(self.job.total_progress, 1.0)

    def test_job_update_progress_sends_significant_updates(self):
        # Initial progress update
        self.job.update_progress(0.1, 1.0)
        self.job.storage.update_job_progress.assert_called_once_with(
            self.job.job_id, 0.1, 1.0, extra_metadata=self.job.extra_metadata
        )
        self.job.storage.update_job_progress.reset_mock()

        # Progress update with ≥1% change should be sent to storage
        self.job.update_progress(0.12, 1.0)
        self.job.storage.update_job_progress.assert_called_once_with(
            self.job.job_id, 0.12, 1.0, extra_metadata=self.job.extra_metadata
        )

    def test_job_update_progress_sends_on_completion(self):
        # Initial progress update
        self.job.update_progress(0.999, 1.0)
        self.job.storage.update_job_progress.assert_called_once_with(
            self.job.job_id, 0.999, 1.0, extra_metadata=self.job.extra_metadata
        )
        self.job.storage.update_job_progress.reset_mock()

        # Small progress update that reaches 100% should be sent to storage
        self.job.update_progress(1.0, 1.0)
        self.job.storage.update_job_progress.assert_called_once_with(
            self.job.job_id, 1.0, 1.0, extra_metadata=self.job.extra_metadata
        )

    def test_job_update_progress_sends_on_first_total(self):
        # Create a job without initial total_progress
        job = Job(id, track_progress=True)
        job.storage = mock.MagicMock()

        # First update that sets a total should be sent
        job.update_progress(0.1, 100.0)
        job.storage.update_job_progress.assert_called_once_with(
            job.job_id, 0.1, 100.0, extra_metadata=job.extra_metadata
        )

    def test_job_update_progress_sends_on_changed_total(self):
        # First update that sets a total should be sent
        self.job.update_progress(0.1, 100.0)
        self.job.storage.update_job_progress.assert_called_once_with(
            self.job.job_id, 0.1, 100.0, extra_metadata=self.job.extra_metadata
        )

    def test_job_update_progress_sends_on_progress_decrease(self):
        # Initial progress update
        self.job.update_progress(0.5, 1.0)
        self.job.storage.update_job_progress.assert_called_once_with(
            self.job.job_id, 0.5, 1.0, extra_metadata=self.job.extra_metadata
        )
        self.job.storage.update_job_progress.reset_mock()

        # Progress update that decreases progress should be sent to storage
        self.job.update_progress(0.499, 1.0)
        self.job.storage.update_job_progress.assert_called_once_with(
            self.job.job_id, 0.499, 1.0, extra_metadata=self.job.extra_metadata
        )

    def test_job_update_progress_retains_last_saved_values(self):
        # Initial progress update
        self.job.update_progress(0.1, 1.0)

        # Verify last saved values are updated after storage call
        self.assertEqual(self.job._last_saved_progress, 0.1)
        self.assertEqual(self.job._last_saved_total_progress, 1.0)

        # Small update that shouldn't be saved to storage
        self.job.update_progress(0.105, 1.0)

        # Last saved values should remain unchanged
        self.assertEqual(self.job._last_saved_progress, 0.1)
        self.assertEqual(self.job._last_saved_total_progress, 1.0)

        # Progress values should be updated
        self.assertEqual(self.job.progress, 0.105)
        self.assertEqual(self.job.total_progress, 1.0)

    def test_float_progress_calculation(self):
        # Test the helper method for calculating float progress

        # Normal case
        result = self.job._float_progress(5, 10)
        self.assertEqual(result, 0.5)

        # Zero total case
        result = self.job._float_progress(5, 0)
        self.assertEqual(result, 5)

        # None total case
        result = self.job._float_progress(5, None)
        self.assertEqual(result, 5)

    def test_job_update_progress_with_metadata(self):
        # Initial progress update with metadata
        metadata = {"stage": "extraction", "files_processed": 10}
        self.job.update_progress(0.5, 1.0, extra_metadata=metadata)

        # Verify the method updates both progress and metadata
        self.assertEqual(self.job.progress, 0.5)
        self.assertEqual(self.job.total_progress, 1.0)
        self.assertEqual(self.job.extra_metadata["stage"], "extraction")
        self.assertEqual(self.job.extra_metadata["files_processed"], 10)

        # Verify storage was called with the correct parameters
        self.job.storage.update_job_progress.assert_called_once_with(
            self.job.job_id, 0.5, 1.0, extra_metadata=self.job.extra_metadata
        )

    def test_job_update_progress_throttles_with_metadata(self):
        # Initial progress update with metadata
        self.job.update_progress(0.1, 1.0, extra_metadata={"stage": "start"})
        self.job.storage.update_job_progress.assert_called_once_with(
            self.job.job_id, 0.1, 1.0, extra_metadata=self.job.extra_metadata
        )
        self.job.storage.update_job_progress.reset_mock()

        # Small progress update with new metadata should still be throttled
        self.job.update_progress(0.105, 1.0, extra_metadata={"files": 5})
        self.job.storage.update_job_progress.assert_not_called()

        # Local metadata should be updated even if storage update is throttled
        self.assertEqual(self.job.extra_metadata["files"], 5)

        # Significant progress update should update both progress and all metadata
        self.job.update_progress(0.2, 1.0, extra_metadata={"files": 10})
        self.job.storage.update_job_progress.assert_called_once_with(
            self.job.job_id, 0.2, 1.0, extra_metadata=self.job.extra_metadata
        )

    def test_update_metadata_still_works_separately(self):
        # Updating metadata directly should still call save_meta
        self.job.update_metadata(key="value")
        self.job.storage.save_job_meta.assert_called_once()
        self.assertEqual(self.job.extra_metadata["key"], "value")

    def test_multiple_metadata_updates_in_throttled_progress(self):
        # Initial progress update
        self.job.update_progress(0.1, 1.0)
        self.job.storage.update_job_progress.assert_called_once_with(
            self.job.job_id, 0.1, 1.0, extra_metadata=self.job.extra_metadata
        )
        self.job.storage.update_job_progress.reset_mock()

        # Multiple metadata updates during throttled period
        self.job.update_progress(0.105, 1.0, extra_metadata={"step": 1})
        self.job.update_progress(0.108, 1.0, extra_metadata={"step": 2})
        self.job.update_progress(0.109, 1.0, extra_metadata={"step": 3})

        # Storage should not have been called
        self.job.storage.update_job_progress.assert_not_called()

        # Latest metadata should be kept locally
        self.assertEqual(self.job.extra_metadata["step"], 3)

        # Significant update should send all accumulated metadata
        self.job.update_progress(0.2, 1.0, extra_metadata={"step": 4})
        self.job.storage.update_job_progress.assert_called_once_with(
            self.job.job_id, 0.2, 1.0, extra_metadata=self.job.extra_metadata
        )
        self.assertEqual(self.job.extra_metadata["step"], 4)

    # End of generated tests


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
