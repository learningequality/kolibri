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
        switch (this.syncStatus) {
          case SyncStatus.RECENTLY_SYNCED:
            return this.$tr('syncedDescription');
          case SyncStatus.QUEUED:
            return this.$tr('queuedDescription');
          case SyncStatus.SYNCING:
            return this.$tr('syncingDescription');
          case SyncStatus.UNABLE_TO_SYNC:
            return this.$tr('noSyncDescription');
          case SyncStatus.NOT_CONNECTED:
            return this.$tr('notConnectedDescription');
          default:
            return '';
        }
      },
    },
    $trs: {
      syncedDescription: 'Device has recently successfully synced to class server',
      syncingDescription: 'Device is in the process of syncing information',
      queuedDescription: 'Device is in queue to sync',
      noSyncDescription:
        'The problem can be that the device is connected to server but hasn’t recently synced. Or syncing was attempted but failed for some reason.',
      notConnectedDescription: 'Device isn’t connected to a server it can sync with',
    },
  };

</script>
