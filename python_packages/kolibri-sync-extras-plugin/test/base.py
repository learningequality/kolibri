import mock
from django.test import SimpleTestCase
from morango.constants import transfer_stages
from morango.models.core import SyncSession
from morango.models.core import TransferSession
from morango.sync.context import LocalSessionContext


DUMMY_PASSWORD = "password"


class BaseTestCase(SimpleTestCase):
    def setUp(self):
        super(BaseTestCase, self).setUp()
        self.sync_session = mock.Mock(spec=SyncSession, id="abc123", extra_fields="{}")
        self.transfer_session = mock.Mock(
            spec=TransferSession,
            id="def456",
            sync_session=self.sync_session,
            push=True,
        )
        self.context = mock.Mock(
            spec=LocalSessionContext,
            transfer_session=self.transfer_session,
            sync_session=self.sync_session,
            is_push=self.transfer_session.push,
            capabilities=set(),
            is_server=True,
            stage=transfer_stages.DEQUEUING,
        )
