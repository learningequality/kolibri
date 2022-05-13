from datetime import datetime
from datetime import timedelta

import mock
from django.test.testcases import TestCase

from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.permissions import IsSuperAdmin
from kolibri.core.tasks.registry import RegisteredTask
from kolibri.core.tasks.validation import JobValidator


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
        )

    def test_constructor_sets_required_params(self):
        self.assertEqual(self.registered_task.func, int)
        self.assertEqual(self.registered_task.validator, JobValidator)
        self.assertEqual(self.registered_task.priority, Priority.HIGH)
        self.assertTrue(isinstance(self.registered_task.permissions[0], IsSuperAdmin))
        self.assertEqual(self.registered_task.job_id, "test")
        self.assertEqual(self.registered_task.queue, "test")
        self.assertEqual(self.registered_task.cancellable, True)
        self.assertEqual(self.registered_task.track_progress, True)

    @mock.patch("kolibri.core.tasks.registry.Job", spec=True)
    def test__ready_job(self, MockJob):
        result = self.registered_task._ready_job(args=("10",), kwargs=dict(base=10))

        MockJob.assert_called_once_with(
            self.registered_task,
            args=("10",),  # arg that was passed to _ready_job()
            job_id="test",
            cancellable=True,
            track_progress=True,
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
            delta, "job", queue="test", interval=10, priority=5, repeat=10
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
            now, "job", queue="test", interval=10, priority=5, repeat=10
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
        )
