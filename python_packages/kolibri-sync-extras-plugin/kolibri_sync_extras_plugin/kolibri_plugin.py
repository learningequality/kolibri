from kolibri.core.auth.hooks import FacilityDataSyncHook
from kolibri.plugins.hooks import register_hook

from kolibri_sync_extras_plugin.sync.operations import BackgroundInitializeJobOperation
from kolibri_sync_extras_plugin.sync.operations import BackgroundFinalizeJobOperation


@register_hook
class SyncExtrasPluginHook(FacilityDataSyncHook):
    serializing_operations = [BackgroundInitializeJobOperation()]
    queuing_operations = [BackgroundInitializeJobOperation()]
    dequeuing_operations = [BackgroundFinalizeJobOperation()]
    deserializing_operations = [BackgroundFinalizeJobOperation()]
    cleanup_operations = [BackgroundFinalizeJobOperation()]
