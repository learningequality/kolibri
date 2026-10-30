import threading
import time
from unittest import mock

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


class TestPostgresNotifier:
    @pytest.fixture
    def is_postgres(self):
        if connections[ORMJob.objects.db].vendor != "postgresql":
            pytest.skip("PostgreSQL not configured")

    @pytest.fixture
    def setup_attempts(self):
        attempts = []
        with mock.patch.object(
            PostgresNotifier,
            "_setup_connection",
            lambda notifier: attempts.append(notifier),
        ):
            yield attempts

    @pytest.fixture
    def degraded_notifier(self, setup_attempts):
        notifier = PostgresNotifier(channel="test_kolibri_channel")
        yield notifier
        notifier.shutdown()

    def test_notify_interrupts_degraded_wait(self, degraded_notifier):
        degraded_notifier.notify()

        assert degraded_notifier.wait_for_job(timeout=5.0) is True

    def test_degraded_wait_times_out(self, degraded_notifier):
        start = time.monotonic()
        result = degraded_notifier.wait_for_job(timeout=0.1)
        elapsed = time.monotonic() - start

        assert result is False
        assert elapsed >= 0.1

    def test_degraded_wait_capped_at_poll_interval(self, degraded_notifier):
        start = time.monotonic()
        result = degraded_notifier.wait_for_job(timeout=5.0)
        elapsed = time.monotonic() - start

        assert result is False
        assert elapsed < 1.0

    def test_degraded_wait_retries_connection_throttled(
        self, degraded_notifier, setup_attempts
    ):
        degraded_notifier.wait_for_job(timeout=0.01)
        degraded_notifier.wait_for_job(timeout=0.01)

        assert len(setup_attempts) == 2

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
