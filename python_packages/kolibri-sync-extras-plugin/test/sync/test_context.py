from morango.constants import transfer_stages
from morango.constants import transfer_statuses

from ..base import BaseTestCase
from kolibri_sync_extras_plugin.sync.context import BackgroundSessionContext


class SyncContextTestCase(BaseTestCase):
    def test_background_context(self):
        context = BackgroundSessionContext(transfer_session=self.transfer_session)
        self.assertTrue(context.is_server)
        self.assertTrue(context.is_receiver)
        context.update_state(
            stage=transfer_stages.QUEUING, stage_status=transfer_statuses.STARTED
        )
        self.transfer_session.update_state.assert_called_once()
