import mock
from django.test.testcases import TestCase

from kolibri.core.tasks.job import Job


class JobTest(TestCase):
    def setUp(self):
        self.job = Job(id)

    def test_job_save_as_cancellable(self):
        callback = mock.Mock()
        self.job.save_as_cancellable_method = callback
        cancellable = not self.job.cancellable

        self.job.save_as_cancellable(cancellable=cancellable)
        callback.assert_called_once_with(self.job.job_id, cancellable=cancellable)

    def test_job_save_as_cancellable__skip(self):
        cancellable = self.job.cancellable
        self.job.save_as_cancellable(cancellable=cancellable)

    def test_job_save_as_cancellable__no_callback(self):
        cancellable = not self.job.cancellable
        with self.assertRaises(ReferenceError):
            self.job.save_as_cancellable(cancellable=cancellable)
