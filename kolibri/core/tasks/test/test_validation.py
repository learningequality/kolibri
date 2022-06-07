from django.test import SimpleTestCase
from rest_framework import serializers

from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.validation import JobValidator


class JobValidatorTestCase(SimpleTestCase):
    def setUp(self):
        def add(x, y):
            return x + y

        self.job = Job(
            add,
            job_id="123",
            state=State.PENDING,
            args=("test",),
            kwargs={"test": True},
            track_progress=True,
            cancellable=False,
            extra_metadata={"extra": True},
        )

    def test_validate_for_restart(self):
        for state in [State.CANCELED, State.FAILED]:
            self.job.state = state
            validator = JobValidator(instance=self.job)
            self.assertEqual(
                validator.data,
                dict(
                    job_id="123",
                    args=("test",),
                    kwargs={"test": True},
                    track_progress=True,
                    cancellable=False,
                    extra_metadata={"extra": True},
                    facility_id=None,
                ),
            )

    def test_validate_for_restart__not_restartable(self):
        for state in [State.QUEUED, State.COMPLETED, State.SCHEDULED, State.RUNNING]:
            self.job.state = state
            validator = JobValidator(instance=self.job)

            with self.assertRaises(serializers.ValidationError):
                self.assertFalse(validator.data)
