import mock
from django.test.testcases import TestCase

from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import RegisteredJob


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


class TestRegisteredJob(TestCase):
    def setUp(self):
        self.registered_job = RegisteredJob(
            int,
            validator=int,
            priority="high",
            queue="test",
            permission_classes=[int],
            job_id="test",
            cancellable=True,
            track_progress=True,
        )

    def test_constructor_sets_required_params(self):
        self.assertEqual(self.registered_job.func, int)
        self.assertEqual(self.registered_job.validator, int)
        self.assertEqual(self.registered_job.priority, "HIGH")
        self.assertEqual(self.registered_job.permissions, [p() for p in [int]])
        self.assertEqual(self.registered_job.job_id, "test")
        self.assertEqual(self.registered_job.queue, "test")
        self.assertEqual(self.registered_job.cancellable, True)
        self.assertEqual(self.registered_job.track_progress, True)

    @mock.patch("kolibri.core.tasks.job.Job", spec=True)
    def test__ready_job(self, MockJob):
        result = self.registered_job._ready_job("10", base=10)

        MockJob.assert_called_once_with(
            int,
            "10",  # arg that was passed to _ready_job()
            job_id="test",
            cancellable=True,
            track_progress=True,
            base=10,  # kwarg that was passed to _ready_job()
        )

        # Do we return the job object?
        self.assertIsInstance(result, Job)

    @mock.patch("kolibri.core.tasks.job.RegisteredJob._ready_job")
    @mock.patch("kolibri.core.tasks.main.scheduler")
    def test_enqueue_in(self, mock_scheduler, _ready_job_mock):
        args = ("10",)
        kwargs = dict(base=10)

        _ready_job_mock.return_value = "job"

        self.registered_job.enqueue_in(
            delta_time="delta_time",
            interval=10,
            repeat=10,
            args=args,
            kwargs=kwargs,
        )

        _ready_job_mock.assert_called_once_with(*args, **kwargs)
        mock_scheduler.enqueue_in.assert_called_once_with(
            func="job",
            delta_t="delta_time",
            interval=10,
            repeat=10,
        )

    @mock.patch("kolibri.core.tasks.job.RegisteredJob._ready_job")
    @mock.patch("kolibri.core.tasks.main.scheduler")
    def test_enqueue_at(self, mock_scheduler, _ready_job_mock):
        args = ("10",)
        kwargs = dict(base=10)

        _ready_job_mock.return_value = "job"

        self.registered_job.enqueue_at(
            datetime="datetime",
            interval=10,
            repeat=10,
            args=args,
            kwargs=kwargs,
        )

        _ready_job_mock.assert_called_once_with(*args, **kwargs)
        mock_scheduler.enqueue_at.assert_called_once_with(
            func="job",
            dt="datetime",
            interval=10,
            repeat=10,
        )

    @mock.patch("kolibri.core.tasks.job.RegisteredJob._ready_job")
    @mock.patch("kolibri.core.tasks.main.job_storage")
    def test_enqueue(self, job_storage_mock, _ready_job_mock):
        args = ("10",)
        kwargs = dict(base=10)

        _ready_job_mock.return_value = "job"

        self.registered_job.enqueue(*args, **kwargs)

        _ready_job_mock.assert_called_once_with(*args, **kwargs)
        job_storage_mock.enqueue_job.assert_called_once_with(
            "job", self.registered_job.queue, self.registered_job.priority
        )
