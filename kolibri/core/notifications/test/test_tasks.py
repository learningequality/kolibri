import threading
import uuid

from django.db import connections
from django.db import router
from django.db import transaction
from django.db.backends.signals import connection_created
from django.db.utils import OperationalError
from django.test import TestCase
from django.test import TransactionTestCase
from mock import MagicMock
from mock import patch

from ..api import create_notification
from ..api import save_notifications
from ..models import LearnerProgressNotification
from ..models import NotificationEventType
from ..models import NotificationObjectType
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


def _notification():
    return create_notification(
        NotificationObjectType.Resource,
        NotificationEventType.Started,
        uuid.uuid4().hex,
        uuid.uuid4().hex,
    )


class QueueThreadTest(TransactionTestCase):
    databases = "__all__"

    def test_thread_survives_a_failing_write_while_default_is_locked(self):
        queue = AsyncNotificationQueue()
        queue.log_saving_interval = 0.05
        attempted = threading.Event()
        saved = threading.Event()
        notification = _notification()

        def failing_write():
            attempted.set()
            raise OperationalError("database is locked")

        def write():
            save_notifications([notification])
            saved.set()

        with transaction.atomic():
            queue.queue.append(failing_write)
            thread = threading.Thread(target=queue.start, daemon=True)
            thread.start()
            self.assertTrue(attempted.wait(5))
            queue.queue.append(write)
            self.assertTrue(saved.wait(5))
        self.assertTrue(thread.is_alive())
        self.assertTrue(
            LearnerProgressNotification.objects.filter(
                user_id=notification.user_id
            ).exists()
        )

    def test_batch_touches_only_the_notifications_database(self):
        alias = router.db_for_write(LearnerProgressNotification)
        queue = AsyncNotificationQueue()
        worker = threading.Thread(target=queue.run)
        connected = []
        in_transaction = []

        def record(sender, connection, **kwargs):
            if threading.current_thread() is worker:
                connected.append(connection.alias)

        connection_created.connect(record)
        self.addCleanup(connection_created.disconnect, record)
        queue.running = [
            lambda: save_notifications([_notification()]),
            lambda: in_transaction.extend(
                a for a in connections if connections[a].in_atomic_block
            ),
        ]
        wrapper_class = type(connections[alias])
        # Django ignores close() on an in-memory SQLite database, so the call is all a test can observe.
        with patch.object(
            wrapper_class, "close", autospec=True, side_effect=wrapper_class.close
        ) as close:
            worker.start()
            worker.join()

        self.assertEqual(connected, [alias])
        self.assertEqual(in_transaction, [])
        self.assertIn(alias, [args[0].alias for args, _ in close.call_args_list])
