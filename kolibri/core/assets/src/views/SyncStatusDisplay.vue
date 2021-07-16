<template>

  <span>
    <KCircularLoader
      v-if="syncInProgress"
      :size="20"
      class="inline-loader"
      data-test="syncStatusSpinner"
    />
    <KIcon
      v-else
      :icon="syncIconDisplayMap"
      class="inline-icon"
      data-test="syncStatusIcon"
    />
    <p :class="displaySize" data-test="syncStatusText">{{ syncTextDisplayMap }}</p>
  </span>

</template>


<script>

  import { SyncStatus } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'SyncStatusDisplay',
    props: {
      syncStatus: {
        type: String,
        default: '',
      },
      displaySize: {
        type: String,
        default: '',
      },
    },
    computed: {
      syncTextDisplayMap() {
        switch (this.syncStatus) {
          case SyncStatus.RECENTLY_SYNCED:
            return this.$tr('recentlySynced');
          case SyncStatus.QUEUED:
            return this.$tr('queued');
          case SyncStatus.SYNCING:
            return this.$tr('syncing');
          case SyncStatus.UNABLE_TO_SYNC:
            return this.$tr('unableToSync');
          // case SyncStatus.NOT_RECENTLY_SYNCED:
          //   return this.$tr('notRecentlySynced');
          case SyncStatus.NOT_CONNECTED:
            return this.$tr('notConnected');
          default:
            return '';
        }
      },
      syncIconDisplayMap() {
        switch (this.syncStatus) {
          case SyncStatus.RECENTLY_SYNCED:
            return 'onDevice';
          case SyncStatus.UNABLE_TO_SYNC:
            return 'error';
          case SyncStatus.NOT_RECENTLY_SYNCED:
            return 'error';
          case SyncStatus.NOT_CONNECTED:
            return 'error';
          default:
            return null;
        }
      },
      syncInProgress() {
        if (this.syncStatus === SyncStatus.SYNCING || this.syncStatus === SyncStatus.QUEUED) {
          return true;
        }
        return false;
      },
    },
    $trs: {
      recentlySynced: 'Synced',
      syncing: 'Syncing...',
      queued: 'Waiting to sync...',
      unableToSync: 'Unable to sync',
      // notRecentlySynced: 'Last synced ___ minutes ago',
      notConnected: 'Not connected to server',
    },
  };

</script>


<style lang="scss" scoped>

  .inline-loader {
    display: inline-block;
    margin-right: 8px;
    vertical-align: bottom;
  }

  .inline-icon {
    margin-right: 8px;
    vertical-align: top;
  }

  .sync-status-small {
    display: inline-block;
    margin-top: 0;
    font-size: 11px;
  }

  .sync-status-large {
    display: inline-block;
    margin-top: 0;
    margin-bottom: 0;
    font-size: 14px;
  }

  .sync-status-large-bold {
    display: inline-block;
    margin-top: 0;
    margin-bottom: 0;
    font-size: 14px;
    font-weight: bold;
  }

</style>
