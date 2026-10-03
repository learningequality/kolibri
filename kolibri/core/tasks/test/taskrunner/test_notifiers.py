import threading
import time

import pytest
from django.db import connections

from kolibri.core.tasks.models import Job as ORMJob
from kolibri.core.tasks.notifiers import EventNotifier
from kolibri.core.tasks.notifiers import PostgresNotifier


class TestEventNotifier:
    def test_notify_wakes_a_blocked_wait(self):
        notifier = EventNotifier()
        started = threading.Event()
        result = [None]

        def waiter():
            started.set()
            result[0] = notifier.wait_for_job(timeout=5.0)

        t = threading.Thread(target=waiter)
        t.start()
        started.wait(timeout=1.0)

        notifier.notify()
        t.join(timeout=2.0)

        assert not t.is_alive()
        assert result[0] is True

    def test_unnotified_wait_times_out(self):
        notifier = EventNotifier()
        start = time.monotonic()
        result = notifier.wait_for_job(timeout=0.1)
        elapsed = time.monotonic() - start

        assert result is False
        assert elapsed >= 0.1

    def test_shutdown_is_noop(self):
        notifier = EventNotifier()
        notifier.shutdown()

    def test_event_cleared_after_wait(self):
        notifier = EventNotifier()
        notifier.notify()

        result1 = notifier.wait_for_job(timeout=0.01)
        assert result1 is True

        result2 = notifier.wait_for_job(timeout=0.05)
        assert result2 is False

    def test_notify_during_timeout_window_not_lost(self):
        notifier = EventNotifier()
        original_wait = notifier._event.wait

        def wait_then_notify(timeout=None):
            result = original_wait(timeout)
            notifier.notify()
            return result

        notifier._event.wait = wait_then_notify
        assert notifier.wait_for_job(timeout=0.01) is False
        notifier._event.wait = original_wait

        assert notifier.wait_for_job(timeout=0.01) is True

    def test_multiple_notifies_coalesce(self):
        notifier = EventNotifier()

        for _ in range(5):
            notifier.notify()

        result = notifier.wait_for_job(timeout=0.01)
        assert result is True

        result2 = notifier.wait_for_job(timeout=0.05)
        assert result2 is False

    def test_notify_wakes_multiple_waiters(self):
        notifier = EventNotifier()
        results = [None, None]
        ready = threading.Barrier(3)

        def waiter(index):
            ready.wait()
            results[index] = notifier.wait_for_job(timeout=2.0)

        t1 = threading.Thread(target=waiter, args=(0,))
        t2 = threading.Thread(target=waiter, args=(1,))
        t1.start()
        t2.start()

        ready.wait()
        notifier.notify()

        t1.join(timeout=2.0)
        t2.join(timeout=2.0)

        assert True in results


class TestPostgresNotifier:
    @pytest.fixture
    def is_postgres(self):
        if connections[ORMJob.objects.db].vendor != "postgresql":
            pytest.skip("PostgreSQL not configured")

    def _degraded_notifier(self):
        notifier = PostgresNotifier(channel="test_kolibri_channel")
        notifier._close_connection()
        return notifier

    def test_notify_interrupts_degraded_wait(self):
        notifier = self._degraded_notifier()
        try:
            started = threading.Event()
            result = [None]

            def waiter():
                started.set()
                result[0] = notifier.wait_for_job(timeout=5.0)

            t = threading.Thread(target=waiter)
            t.start()
            started.wait(timeout=1.0)

            notifier.notify()
            t.join(timeout=2.0)

            assert not t.is_alive()
            assert result[0] is True
        finally:
            notifier.shutdown()

    def test_degraded_wait_times_out(self):
        notifier = self._degraded_notifier()
        try:
            start = time.monotonic()
            result = notifier.wait_for_job(timeout=0.1)
            elapsed = time.monotonic() - start

            assert result is False
            assert elapsed >= 0.1
        finally:
            notifier.shutdown()

    def test_degraded_wait_retries_connection_throttled(self):
        notifier = self._degraded_notifier()
        try:
            attempts = []
            original = notifier._setup_connection

            def counting():
                attempts.append(1)
                original()

            notifier._setup_connection = counting

            notifier.wait_for_job(timeout=0.01)
            assert len(attempts) == 1

            notifier.wait_for_job(timeout=0.01)
            assert len(attempts) == 1
        finally:
            notifier.shutdown()

    def test_invalid_channel_name_rejected(self):
        with pytest.raises(ValueError):
            PostgresNotifier(channel="invalid;channel")

        with pytest.raises(ValueError):
            PostgresNotifier(channel="invalid'channel")

        with pytest.raises(ValueError):
            PostgresNotifier(channel="123invalid")

    def test_uses_dedicated_connection(self, is_postgres):
        notifier = PostgresNotifier(channel="test_kolibri_channel")
        try:
            assert notifier._connection is not None
            assert notifier._connection is not connections[ORMJob.objects.db].connection
        finally:
            notifier.shutdown()

    def test_shutdown_closes_connection(self, is_postgres):
        notifier = PostgresNotifier(channel="test_kolibri_channel")
        connection = notifier._connection
        notifier.shutdown()

        assert connection.closed
        assert notifier._connection is None
