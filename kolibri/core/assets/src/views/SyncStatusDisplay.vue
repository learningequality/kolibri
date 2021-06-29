<template>

  <span>
    <KCircularLoader
      v-if="syncInProgress"
      size="20"
      class="inline-loader"
    />
    <KIcon
      v-else
      :icon="syncIconDisplayMap"
      class="inline-icon"
    />
    <p class="sync-status">{{ syncTextDisplayMap }}</p>
  </span>

</template>


<script>

  import { SyncStatus } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'SyncStatusDisplay',
    data: () => ({
      syncStatus: 'RECENTLY_SYNCED',
    }),
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
          case SyncStatus.NOT_RECENTLY_SYNCED:
            return this.$tr('notRecentlySynced');
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
            return '';
        }
      },
      syncInProgress() {
        if (this.syncStatus === SyncStatus.SYNCING || this.syncStatus === SyncStatus.QUEUED) {
          return true;
        }
        return false;
      },
      // pollSyncTask() {
      //   // Like facilityTaskQueue, just keep polling until component is destroyed
      //   FacilityTaskResource.fetchModel({ id: this.syncTaskId, force: true }).then(task => {
      //     if (task.clearable) {
      //       this.isSyncing = false;
      //       this.syncTaskId = '';
      //       FacilityTaskResource.deleteFinishedTask(this.syncTaskId);
      //       if (task.status === TaskStatuses.FAILED) {
      //         this.syncHasFailed = true;
      //       } else if (task.status === TaskStatuses.COMPLETED) {
      //         this.fetchFacility();
      //       }
      //     } else if (this.syncTaskId) {
      //       setTimeout(() => {
      //         this.pollSyncTask();
      //       }, 2000);
      //     }
      //   });
      // },
    },
    $trs: {
      recentlySynced: 'Synced ___ minutes ago',
      syncing: 'Syncing...',
      queued: 'Waiting to sync...',
      unableToSync: 'Unable to sync',
      notRecentlySynced: 'Last synced ___ minutes ago',
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
    vertical-align: middle;
  }

  .sync-status {
    display: inline-block;
    margin-top: 0;
    font-size: 11px;
  }

</style>
