from django.test import TestCase
from mock import MagicMock

from ..tasks import AsyncNotificationQueue


class TaskQueueTest(TestCase):
    def test_run_queue_executes_running(self):
        log_queue = AsyncNotificationQueue()
        fn = MagicMock()
        log_queue.running.append(fn)
        log_queue.run()
        self.assertTrue(fn.called)

    def test_run_does_not_execute_queue(self):
        log_queue = AsyncNotificationQueue()
        fn = MagicMock()
        log_queue.queue.append(fn)
        log_queue.run()
        self.assertFalse(fn.called)

    def test_run_executes_all_after_exceptions(self):
        log_queue = AsyncNotificationQueue()

        def exception_fn():
            raise Exception("Just because!")

        log_queue.running.append(exception_fn)
        fn = MagicMock()
        log_queue.running.append(fn)
        log_queue.run()
        self.assertTrue(fn.called)

    def test_toggle_queue_changes_queue(self):
        log_queue = AsyncNotificationQueue()
        queue = log_queue.queue
        queue.append(1)
        log_queue.toggle_queue()
        self.assertNotEqual(queue, log_queue.queue)

    def test_clear_running_changes_reference(self):
        log_queue = AsyncNotificationQueue()
        running = log_queue.running
        running.append(1)
        log_queue.clear_running()
        self.assertNotEqual(running, log_queue.running)

    def test_clear_running_wont_clear_queue(self):
        log_queue = AsyncNotificationQueue()
        queue = log_queue.queue
        queue.append(1)
        log_queue.clear_running()
        self.assertEqual(log_queue.queue[0], 1)

    def test_append_queue_adds_to_queue(self):
        log_queue = AsyncNotificationQueue()
        log_queue.append(1)
        self.assertEqual(log_queue.queue[0], 1)
