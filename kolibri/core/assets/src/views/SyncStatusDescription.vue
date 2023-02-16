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
          [SyncStatus.INSUFFICIENT_STORAGE]: this.$tr('insufficientStorageDescription'),
          [SyncStatus.NOT_CONNECTED]: this.$tr('notConnectedDescription'),
        };
        return statusTranslations[this.syncStatus] || '';
      },
    },
    $trs: {
      syncedDescription: {
        message: 'Device has recently successfully synced to class server',
        context: 'Device syncing status explained.',
      },
      syncingDescription: {
        message: 'Device is in the process of syncing information',
        context: 'Device syncing status explained.',
      },
      queuedDescription: {
        message: 'Device is in queue to sync',
        context: 'Device syncing status explained.',
      },
      unableOrNoSyncDescription: {
        message:
          'The problem can be that the device is connected to server but hasn’t recently synced. Or syncing was attempted but failed for some reason.',
        context: 'Device syncing status explained.',
      },
      notConnectedDescription: {
        message: 'Device isn’t connected to a server it can sync with',
        context: 'Device syncing status explained.',
      },
      insufficientStorageDescription: {
        message:
          'This device does not have enough storage for updates. Check the size of your visible lessons and quizzes. Making a lesson or quiz not visible will remove it from learner devices.',
        context: 'Device syncing status explained.',
      },
    },
  };

</script>
