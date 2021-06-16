from django.test import TestCase

from kolibri.core.tasks.decorators import task
from kolibri.core.tasks.exceptions import FunctionNotRegisteredAsJob
from kolibri.core.tasks.job import JobRegistry
from kolibri.core.tasks.job import RegisteredJob
from kolibri.core.tasks.utils import stringify_func


class TestTaskDecorators(TestCase):
    def setUp(self):
        self.registered_jobs = JobRegistry.REGISTERED_JOBS

    def tearDown(self):
        JobRegistry.REGISTERED_JOBS.clear()

    def test_task_register_without_args(self):
        @task.register
        def add(x, y):
            return x + y

        @task.register()
        def subtract(x, y):
            return x - y

        add_funcstr = stringify_func(add)
        subtract_funcstr = stringify_func(subtract)

        self.assertIsInstance(self.registered_jobs[add_funcstr], RegisteredJob)
        self.assertIsInstance(self.registered_jobs[subtract_funcstr], RegisteredJob)

    def test_task_register_with_args(self):
        @task.register(
            job_id="test", validator=id, permission=id, priority=task.priority.HIGH
        )
        def add(x, y):
            return x + y

        add_funcstr = stringify_func(add)

        self.assertIsInstance(self.registered_jobs[add_funcstr], RegisteredJob)

        self.assertEqual(add.task.job_id, "test")
        self.assertEqual(add.task.validator, id)
        self.assertEqual(add.task.permission, id)
        self.assertEqual(add.task.priority, task.priority.HIGH)

    def test_task_config_without_args(self):
        @task.config
        @task.register
        def add(x, y):
            return x + y

        @task.config()
        @task.register
        def subtract(x, y):
            return x - y

        self.assertIsNone(add.task.group)
        self.assertFalse(add.task.track_progress)
        self.assertFalse(add.task.cancellable)

        self.assertIsNone(subtract.task.group)
        self.assertFalse(subtract.task.track_progress)
        self.assertFalse(subtract.task.cancellable)

    def test_task_config_with_args(self):
        @task.config(group="math", cancellable=True, track_progress=True)
        @task.register
        def add(x, y):
            return x + y

        self.assertEqual(add.task.group, "math")
        self.assertTrue(add.task.cancellable)
        self.assertTrue(add.task.track_progress)

    def test_task_register_config_both_with_args(self):
        @task.config(group="math", cancellable=True, track_progress=True)
        @task.register(
            job_id="test", validator=id, permission=id, priority=task.priority.HIGH
        )
        def add(x, y):
            return x + y

        add_funcstr = stringify_func(add)

        self.assertIsInstance(self.registered_jobs[add_funcstr], RegisteredJob)

        self.assertEqual(add.task.job_id, "test")
        self.assertEqual(add.task.validator, id)
        self.assertEqual(add.task.permission, id)
        self.assertEqual(add.task.priority, task.priority.HIGH)

        self.assertEqual(add.task.group, "math")
        self.assertTrue(add.task.cancellable)
        self.assertTrue(add.task.track_progress)

    def test_task_config_without_register(self):
        with self.assertRaises(FunctionNotRegisteredAsJob):

            @task.config
            def add(x, y):
                return x + y

    def test_task_register_config_preserves_functionality(self):
        @task.config
        @task.register
        def add(x, y):
            return x + y

        self.assertEqual(add(2, 40), 42)
