from .base import BaseTestCase
from kolibri_sync_extras_plugin.kolibri_plugin import SyncExtrasPluginHook
from kolibri_sync_extras_plugin.sync.operations import BackgroundFinalizeJobOperation
from kolibri_sync_extras_plugin.sync.operations import BackgroundInitializeJobOperation


class SyncExtrasPluginTestCase(BaseTestCase):
    @classmethod
    def setUpClass(cls):
        super(SyncExtrasPluginTestCase, cls).setUpClass()
        cls.plugin = SyncExtrasPluginHook()

    def assertOperationsInstanceOf(self, operations, operation_class):
        for operation in operations:
            self.assertIsInstance(operation, operation_class)

    def test_initialize_operations(self):
        self.assertOperationsInstanceOf(
            self.plugin.serializing_operations, BackgroundInitializeJobOperation
        )
        self.assertOperationsInstanceOf(
            self.plugin.queuing_operations, BackgroundInitializeJobOperation
        )

    def test_finalize_operations(self):
        self.assertOperationsInstanceOf(
            self.plugin.dequeuing_operations, BackgroundFinalizeJobOperation
        )
        self.assertOperationsInstanceOf(
            self.plugin.deserializing_operations, BackgroundFinalizeJobOperation
        )
        self.assertOperationsInstanceOf(
            self.plugin.cleanup_operations, BackgroundFinalizeJobOperation
        )
