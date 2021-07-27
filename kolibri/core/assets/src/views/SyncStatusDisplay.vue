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
        validator(val) {
          return ['small', 'large', 'large-bold'].includes(val);
        },
      },
    },
    computed: {
      syncTextDisplayMap() {
        const statusTranslations = {
          [SyncStatus.RECENTLY_SYNCED]: this.$tr('recentlySynced'),
          [SyncStatus.QUEUED]: this.$tr('queued'),
          [SyncStatus.SYNCING]: this.$tr('syncing'),
          [SyncStatus.UNABLE_TO_SYNC]: this.$tr('unableToSync'),
          [SyncStatus.UNABLE_OR_NOT_SYNCED]: this.$tr('unableOrNotSynced'),
          [SyncStatus.NOT_CONNECTED]: this.$tr('notConnected'),
        };
        return statusTranslations[this.syncStatus] || '';
      },
      syncIconDisplayMap() {
        const statusIcons = {
          [SyncStatus.RECENTLY_SYNCED]: 'onDevice',
          [SyncStatus.UNABLE_TO_SYNC]: 'error',
          [SyncStatus.NOT_RECENTLY_SYNCED]: 'error',
          [SyncStatus.UNABLE_OR_NOT_SYNCED]: 'error',
          [SyncStatus.NOT_CONNECTED]: 'disconnected',
        };
        return statusIcons[this.syncStatus] || '';
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
      unableOrNotSynced: 'Not recently synced or unable to sync',
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

  .small {
    display: inline-block;
    margin-top: 0;
    font-size: 11px;
  }

  .large {
    display: inline-block;
    margin-top: 0;
    margin-bottom: 0;
    font-size: 14px;
  }

  .large-bold {
    display: inline-block;
    margin-top: 0;
    margin-bottom: 0;
    font-size: 14px;
    font-weight: bold;
  }

</style>
