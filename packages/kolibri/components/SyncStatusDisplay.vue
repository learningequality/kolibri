<template>

  <span :style="{ display: 'flex', alignItems: 'center' }">
    <KCircularLoader
      v-if="syncInProgress"
      :size="20"
      class="inline-loader"
      data-test="syncStatusSpinner"
    />
    <KIcon
      v-else-if="syncIconDisplayMap"
      :icon="syncIconDisplayMap"
      class="inline-icon"
      data-test="syncStatusIcon"
    />
    <p
      :class="displaySize"
      data-test="syncStatusText"
    >
      {{ syncTextDisplayMap }}
    </p>
  </span>

</template>


<script>

  import useNow from 'kolibri/composables/useNow';
  import { SyncStatus } from 'kolibri/constants';

  export default {
    name: 'SyncStatusDisplay',
    setup() {
      const { now } = useNow();
      return { now };
    },
    props: {
      syncStatus: {
        type: String,
        default: '',
      },
      lastSynced: {
        type: Date,
        default: null,
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
          [SyncStatus.RECENTLY_SYNCED]: this.recentlySyncedText,
          [SyncStatus.QUEUED]: this.$tr('queued'),
          [SyncStatus.SYNCING]: this.$tr('syncing'),
          [SyncStatus.UNABLE_TO_SYNC]: this.$tr('unableToSync'),
          [SyncStatus.NOT_RECENTLY_SYNCED]: this.$tr('notRecentlySynced'),
          [SyncStatus.UNABLE_OR_NOT_SYNCED]: this.$tr('unableOrNotSynced'),
          [SyncStatus.INSUFFICIENT_STORAGE]: this.$tr('insufficientStorage'),
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
          [SyncStatus.INSUFFICIENT_STORAGE]: 'error',
          [SyncStatus.NOT_CONNECTED]: 'disconnected',
        };
        return statusIcons[this.syncStatus] || '';
      },
      recentlySyncedText() {
        // Keep it simple if just synced
        if (!this.lastSynced || this.now - this.lastSynced < 10000) {
          return this.$tr('recentlySynced');
        }
        const relativeTime = this.$formatRelative(this.lastSynced, { now: this.now });
        return this.$tr('recentlySyncedRelative', { relativeTime });
      },
      syncInProgress() {
        return this.syncStatus === SyncStatus.SYNCING || this.syncStatus === SyncStatus.QUEUED;
      },
    },
    $trs: {
      recentlySynced: {
        message: 'Synced',
        context: 'Status indicator for a device that has been synced.',
      },
      recentlySyncedRelative: {
        message: 'Synced {relativeTime}',
        context:
          "Status indicator for time period since the last successful sync. For example, 'relativeTime' could be '2 minutes ago'",
      },
      syncing: {
        message: 'Syncing...',
        context: 'Status indicator for a device where syncing is in progress.',
      },
      queued: {
        message: 'Waiting to sync...',
        context: 'Status indicator for a device awaiting to sync with server.',
      },
      unableToSync: {
        message: 'Unable to sync',
        context: 'Status indicator for a device not synced with server.',
      },
      notRecentlySynced: {
        message: 'Not recently synced',
        context:
          'Status indicator for a device not synced with server.\n\nThis message appears when a learn-only device has synced with the server at least once before, but its last sync has been over an hour ago.',
      },
      unableOrNotSynced: {
        message: 'Not recently synced or unable to sync',
        context: 'Status indicator for a device not synced with server.',
      },
      notConnected: {
        message: 'Not connected to server',
        context: 'Status indicator for a disconnected device.',
      },
      insufficientStorage: {
        message: 'Not enough storage',
        context: 'Status indicator for a device that does not have enough storage to sync.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .inline-loader {
    display: inline-block;
    margin-right: 8px;
    margin-left: 0;
    vertical-align: bottom;
  }

  .inline-icon {
    margin-right: 8px;
    vertical-align: top;
  }

  .small {
    display: inline-block;
    margin-top: 0;
    margin-bottom: 0;
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
