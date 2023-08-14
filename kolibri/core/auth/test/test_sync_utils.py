from django.test import TestCase
from mock import Mock
from morango.sync.utils import SyncSignalGroup

from kolibri.core.auth.management.utils import MorangoSyncCommand


class TestProgressTracking(TestCase):
    def test_transfer_tracker_adapter(self):
        # Create an instance of the class you're testing
        instance = MorangoSyncCommand()

        # Mock the relevant methods
        instance.start_progress = Mock()

        instance.progresstracker = Mock()
        instance.progresstracker.progress = 0

        signal_group = SyncSignalGroup()
        # Mock the TransferSession
        transfer_session_mock = Mock()

        transfer_session_mock.records_transferred = 0
        transfer_session_mock.records_total = 10
        transfer_session_mock.bytes_sent = 0
        transfer_session_mock.bytes_received = 0

        # Connect the signal group to _transfer_tracker_adapter for testing
        instance._transfer_tracker_adapter(signal_group, "message", "sync_state", False)

        # Check if start_progress hasn't been called yet
        instance.start_progress.assert_not_called()

        # Simulate the started signal
        signal_group.started.fire(transfer_session=transfer_session_mock)

        # Check that start_progress has now been called
        instance.start_progress.assert_called()

    def test_queueing_tracker_adapter(self):
        # Create an instance of the class you're testing
        instance = MorangoSyncCommand()

        # Mock the relevant methods
        instance.start_progress = Mock()

        instance.progresstracker = Mock()
        instance.progresstracker.progress = 0

        signal_group = SyncSignalGroup()
        # Mock the TransferSession
        transfer_session_mock = Mock()

        transfer_session_mock.records_transferred = 0
        transfer_session_mock.records_total = 10
        transfer_session_mock.bytes_sent = 0
        transfer_session_mock.bytes_received = 0

        # Connect the signal group to _transfer_tracker_adapter for testing
        instance._queueing_tracker_adapter(signal_group, "message", "sync_state", False)

        # Check if start_progress hasn't been called yet
        instance.start_progress.assert_not_called()

        # Simulate the started signal
        signal_group.started.fire(transfer_session=transfer_session_mock)

        # Check that start_progress has now been called
        instance.start_progress.assert_called()
