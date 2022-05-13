from django.test import TestCase
from mock import patch

from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.registry import RegisteredTask


class TestTaskDecorators(TestCase):
    @patch("kolibri.core.tasks.decorators.RegisteredTask")
    def test_register_decorator_calls_registered_job(self, MockRegisteredTask):
        def add(x, y):
            return x + y

        register_task(
            job_id="test",
            validator=id,
            permission_classes=[int],
            priority=Priority.HIGH,
            queue="test",
            cancellable=True,
            track_progress=True,
        )(add)

        MockRegisteredTask.assert_called_once_with(
            add,
            job_id="test",
            validator=id,
            permission_classes=[int],
            priority=Priority.HIGH,
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

        self.assertIsInstance(add, RegisteredTask)
        self.assertIsInstance(subtract, RegisteredTask)

    def test_register_decorator_assigns_api_methods(self):
        @register_task(
            job_id="test",
            validator=id,
            permission_classes=[int],
            priority=Priority.HIGH,
            queue="test",
            cancellable=True,
            track_progress=True,
        )
        def add(x, y):
            return x + y

        self.assertIsInstance(add, RegisteredTask)

        self.assertTrue(add.enqueue)
        self.assertTrue(add.enqueue_in)
        self.assertTrue(add.enqueue_at)

    def test_register_decorator_preserves_functionality(self):
        @register_task
        def add(x, y):
            return x + y

        self.assertEqual(add(2, 40), 42)
