import logging
import re
import select
import socket
import threading
import time

from django.db import connections

from kolibri.core.tasks.constants import JOB_NOTIFICATION_CHANNEL
from kolibri.core.tasks.models import Job as ORMJob

logger = logging.getLogger(__name__)


class BaseNotifier:
    supports_cross_process_notify = False

    def wait_for_job(self, timeout):
        return self._wait_for_notification(timeout)

    def notify(self):
        pass

    def shutdown(self):
        pass

    def _wait_for_notification(self, timeout):
        raise NotImplementedError


class EventNotifier(BaseNotifier):
    def __init__(self):
        self._event = threading.Event()

    def _wait_for_notification(self, timeout):
        notified = self._event.wait(timeout=timeout)
        if notified:
            self._event.clear()
        return notified

    def notify(self):
        self._event.set()


CHANNEL_PATTERN = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")

RECONNECT_INTERVAL = 5.0


class PostgresNotifier(BaseNotifier):
    supports_cross_process_notify = True

    def __init__(self, channel):
        if not CHANNEL_PATTERN.match(channel):
            raise ValueError(f"Invalid channel name: {channel}")

        self._channel = channel
        self._connection = None
        self._connection_valid = False
        self._last_reconnect = None
        self._wake_reader, self._wake_writer = socket.socketpair()
        self._wake_reader.setblocking(False)

        self._setup_connection()

    def _setup_connection(self):
        try:
            django_connection = connections[ORMJob.objects.db]
            self._connection = django_connection.get_new_connection(
                django_connection.get_connection_params()
            )
            self._connection.autocommit = True
            cursor = self._connection.cursor()
            cursor.execute(f"LISTEN {self._channel}")
            cursor.close()
            self._connection_valid = True
        except Exception as e:
            logger.warning("Failed to setup LISTEN: %s", e)
            self._close_connection()

    def _maybe_reconnect(self):
        now = time.monotonic()
        if (
            self._last_reconnect is not None
            and now - self._last_reconnect < RECONNECT_INTERVAL
        ):
            return
        self._last_reconnect = now
        self._setup_connection()

    def _wait_for_notification(self, timeout):
        if not self._connection_valid:
            self._maybe_reconnect()

        read_set = [self._wake_reader]
        if self._connection_valid:
            read_set.append(self._connection)

        try:
            readable, _, _ = select.select(read_set, [], [], timeout)
        except Exception as e:
            logger.warning("Error waiting for notification: %s", e)
            self._close_connection()
            return False

        if not readable:
            return False

        if self._wake_reader in readable:
            self._drain_wake()
        if self._connection_valid and self._connection in readable:
            try:
                self._connection.poll()
                del self._connection.notifies[:]
            except Exception as e:
                logger.warning("Error reading notification: %s", e)
                self._close_connection()
        return True

    def notify(self):
        if self._wake_writer is not None:
            try:
                self._wake_writer.send(b"\x00")
            except OSError:
                pass

    def _drain_wake(self):
        sock = self._wake_reader
        if sock is None:
            return
        try:
            while sock.recv(4096):
                pass
        except (BlockingIOError, OSError):
            pass

    def _close_connection(self):
        self._connection_valid = False
        if self._connection is not None:
            try:
                self._connection.close()
            except Exception as e:
                logger.warning("Error closing notifier connection: %s", e)
            self._connection = None

    def shutdown(self):
        self._close_connection()
        for attr in ("_wake_writer", "_wake_reader"):
            sock = getattr(self, attr, None)
            if sock is not None:
                try:
                    sock.close()
                except OSError:
                    pass
                setattr(self, attr, None)


class NotifierSingleton(type):
    """
    Modelled on ``kolibri.plugins.SingletonMeta``, adding locked construction
    and ``reset()``.
    """

    def __init__(cls, name, bases, namespace):
        super().__init__(name, bases, namespace)
        cls._instance = None
        cls._lock = threading.Lock()

    def __call__(cls, *args, **kwargs):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__call__(*args, **kwargs)
        return cls._instance

    def reset(cls):
        with cls._lock:
            instance, cls._instance = cls._instance, None
        if instance is not None:
            instance.shutdown()


class JobNotifier(metaclass=NotifierSingleton):
    def __init__(self):
        vendor = connections[ORMJob.objects.db].vendor
        if vendor == "postgresql":
            self._backend = PostgresNotifier(channel=JOB_NOTIFICATION_CHANNEL)
        else:
            self._backend = EventNotifier()

    @property
    def supports_cross_process_notify(self):
        return self._backend.supports_cross_process_notify

    def wait_for_job(self, timeout):
        return self._backend.wait_for_job(timeout)

    def notify(self):
        self._backend.notify()

    def shutdown(self):
        self._backend.shutdown()
