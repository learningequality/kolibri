<template>

  <p>
    {{ syncTextDisplayMap }}
  </p>

</template>


<script>

  import { SyncStatus } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'SyncStatusDescription',
    props: {
      syncStatus: {
        type: String,
        default: '',
      },
    },
    computed: {
      syncTextDisplayMap() {
        const statusTranslations = {
          [SyncStatus.RECENTLY_SYNCED]: this.$tr('syncedDescription'),
          [SyncStatus.QUEUED]: this.$tr('queuedDescription'),
          [SyncStatus.SYNCING]: this.$tr('syncingDescription'),
          [SyncStatus.UNABLE_OR_NOT_SYNCED]: this.$tr('unableOrNoSyncDescription'),
          [SyncStatus.NOT_CONNECTED]: this.$tr('notConnectedDescription'),
        };
        return statusTranslations[this.syncStatus] || '';
      },
    },
    $trs: {
      syncedDescription: 'Device has recently successfully synced to class server',
      syncingDescription: 'Device is in the process of syncing information',
      queuedDescription: 'Device is in queue to sync',
      unableOrNoSyncDescription:
        'The problem can be that the device is connected to server but hasn’t recently synced. Or syncing was attempted but failed for some reason.',
      notConnectedDescription: 'Device isn’t connected to a server it can sync with',
    },
  };

</script>
