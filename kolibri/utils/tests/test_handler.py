import logging
import os
import shutil
import tempfile
import threading
from io import StringIO
from queue import Queue
from time import sleep
from time import time

from django.conf import settings
from django.test import override_settings
from django.test import TestCase
from mock import patch

from kolibri.utils import cli
from kolibri.utils.logger import get_logging_config
from kolibri.utils.logger import KolibriTimedRotatingFileHandler
from kolibri.utils.logger import LoggerAwareQueueHandler
from kolibri.utils.logger import LoggerAwareQueueListener


def make_record(message):
    return logging.LogRecord("test", logging.INFO, __file__, 0, message, None, None)


class KolibriTimedRotatingFileHandlerTestCase(TestCase):
    # Mock this function to avoid calling the logger in a way that prevents the archive
    @patch("kolibri.utils.main._upgrades_before_django_setup")
    def test_do_rollover(self, upgrades_mock):
        log_root = os.path.join(os.environ["KOLIBRI_HOME"], "logs")
        archive_dir = os.path.join(log_root, "archive")

        # The test suite disables file logging for speed (see settings/test.py);
        # reinstate the real file-based config to exercise log rotation.
        with override_settings(LOGGING=get_logging_config(log_root)):
            orig_value = settings.LOGGING["handlers"]["file"]["when"]

            # Temporarily set the rotation time of the log file to be every second
            settings.LOGGING["handlers"]["file"]["when"] = "s"
            # make sure that kolibri will be running for more than one second
            try:
                cli.main(["manage", "--skip-update", "help"])
            except SystemExit:
                pass
            sleep(1)
            try:
                cli.main(["manage", "--skip-update", "help"])
            except SystemExit:
                pass
            # change back to the original rotation time
            settings.LOGGING["handlers"]["file"]["when"] = orig_value

            self.assertNotEqual(os.listdir(archive_dir), [])

    def test_getFilesToDelete(self):
        temp_dir = tempfile.mkdtemp()
        file_handle, log_file = tempfile.mkstemp(suffix=".txt", dir=temp_dir)
        os.close(file_handle)
        handler = KolibriTimedRotatingFileHandler(log_file, backupCount=3, when="s")
        sleep(1)
        handler.doRollover()
        sleep(1)
        handler.doRollover()
        sleep(1)
        handler.doRollover()
        sleep(1)
        handler.doRollover()
        self.assertEqual(len(handler.getFilesToDelete()), 1)
        try:
            os.remove(log_file)
        except OSError:
            pass
        shutil.rmtree(temp_dir, ignore_errors=True)

    def _handler_due_for_rollover(self):
        temp_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, temp_dir, ignore_errors=True)
        log_file = os.path.join(temp_dir, "kolibri.txt")
        handler = KolibriTimedRotatingFileHandler(log_file, when="M")
        self.addCleanup(handler.close)
        handler.rolloverAt = time() - 1
        return handler, log_file

    def test_failed_rollover_is_not_retried_on_the_next_record(self):
        # Windows refuses to rename a log file another process holds open. If
        # rolloverAt stays in the past, every subsequent record retries.
        handler, _ = self._handler_due_for_rollover()
        locked = PermissionError(32, "The process cannot access the file")

        with patch.object(handler, "rotate", side_effect=locked) as rotate:
            handler.emit(make_record("first"))
            handler.emit(make_record("second"))

        self.assertEqual(rotate.call_count, 1)
        self.assertGreater(handler.rolloverAt, time())

    def test_logging_continues_after_a_failed_rollover(self):
        handler, log_file = self._handler_due_for_rollover()
        locked = PermissionError(32, "The process cannot access the file")

        with patch.object(handler, "rotate", side_effect=locked):
            handler.emit(make_record("written anyway"))
        handler.flush()

        with open(log_file) as f:
            self.assertIn("written anyway", f.read())


def test_full_queue_drops_records_silently():
    # The default report for a dropped record goes to stderr, which the
    # desktop app pipes straight back into logging.
    handler = LoggerAwareQueueHandler(Queue(maxsize=1), "test")
    stderr = StringIO()

    with patch("sys.stderr", stderr):
        for i in range(5):
            handler.handle(make_record("message {}".format(i)))

    assert stderr.getvalue() == ""


def test_listener_stops_while_the_queue_is_full():
    # QueueListener.stop enqueues its sentinel with put_nowait, which raises on
    # a bounded queue. Shutdown during a log storm finds it in exactly that state.
    release = threading.Event()
    handling = threading.Event()

    class BlockingHandler(logging.Handler):
        def handle(self, record):
            handling.set()
            release.wait(10)

    listener = LoggerAwareQueueListener(Queue(maxsize=1), {"": [BlockingHandler()]})
    listener.start()
    try:
        listener.queue.put(make_record("occupies the handler"))
        handling.wait(10)
        listener.queue.put(make_record("fills the queue"))

        threading.Timer(0.25, release.set).start()
        listener.stop()
    finally:
        release.set()

    assert listener._thread is None
