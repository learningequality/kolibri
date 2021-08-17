from django.test import TestCase
from mock import patch

from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.job import JobRegistry
from kolibri.core.tasks.job import RegisteredJob
from kolibri.core.tasks.utils import stringify_func


class TestTaskDecorators(TestCase):
    def setUp(self):
        self.registered_jobs = JobRegistry.REGISTERED_JOBS

    def tearDown(self):
        JobRegistry.REGISTERED_JOBS.clear()

    @patch("kolibri.core.tasks.decorators.RegisteredJob")
    def test_register_decorator_calls_registered_job(self, MockRegisteredJob):
        @register_task(
            job_id="test",
            validator=id,
            permission_classes=[int],
            priority="high",
            queue="test",
            cancellable=True,
            track_progress=True,
        )
        def add(x, y):
            return x + y

        MockRegisteredJob.assert_called_once_with(
            add,
            job_id="test",
            validator=id,
            permission_classes=[int],
            priority="high",
            queue="test",
            cancellable=True,
            track_progress=True,
        )

    def test_register_decorator_registers_without_args(self):
        @register_task
        def add(x, y):
            return x + y

        @register_task()
        def subtract(x, y):
            return x - y

        add_funcstr = stringify_func(add)
        subtract_funcstr = stringify_func(subtract)

        self.assertIsInstance(self.registered_jobs[add_funcstr], RegisteredJob)
        self.assertIsInstance(self.registered_jobs[subtract_funcstr], RegisteredJob)

    def test_register_decorator_assigns_api_methods(self):
        @register_task(
            job_id="test",
            validator=id,
            permission_classes=[int],
            priority="high",
            queue="test",
            cancellable=True,
            track_progress=True,
        )
        def add(x, y):
            return x + y

        add_registered_job = self.registered_jobs[stringify_func(add)]

        self.assertIsInstance(add_registered_job, RegisteredJob)

        self.assertEqual(add.enqueue, add_registered_job.enqueue)
        self.assertEqual(add.enqueue_in, add_registered_job.enqueue_in)
        self.assertEqual(add.enqueue_at, add_registered_job.enqueue_at)

    def test_register_decorator_preserves_functionality(self):
        @register_task
        def add(x, y):
            return x + y

        self.assertEqual(add(2, 40), 42)
