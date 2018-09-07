from django.test import TestCase
from mock import MagicMock

from ..tasks import AsyncLogQueue


class TaskQueueTest(TestCase):

    def test_run_queue_executes_inactive_queue(self):
        log_queue = AsyncLogQueue()
        fn = MagicMock()
        log_queue.inactive_queue.append(fn)
        log_queue.run_queue()
        self.assertTrue(fn.called)

    def test_run_queue_does_not_execute_active_queue(self):
        log_queue = AsyncLogQueue()
        fn = MagicMock()
        log_queue.active_queue.append(fn)
        log_queue.run_queue()
        self.assertFalse(fn.called)

    def test_toggle_queue_changes_queue(self):
        log_queue = AsyncLogQueue()
        active_queue = log_queue.active_queue
        active_queue.append(1)
        log_queue.toggle_active_queue()
        self.assertNotEqual(active_queue, log_queue.active_queue)

    def test_clear_queue_changes_queue_reference(self):
        log_queue = AsyncLogQueue()
        inactive_queue = log_queue.inactive_queue
        inactive_queue.append(1)
        log_queue.clear_queue()
        self.assertNotEqual(inactive_queue, log_queue.inactive_queue)

    def test_clear_queue_wont_clear_active_queue(self):
        log_queue = AsyncLogQueue()
        active_queue = log_queue.active_queue
        active_queue.append(1)
        log_queue.clear_queue()
        self.assertEqual(log_queue.active_queue[0], 1)

    def test_append_queue_adds_to_active_queue(self):
        log_queue = AsyncLogQueue()
        log_queue.append(1)
        self.assertEqual(log_queue.active_queue[0], 1)
