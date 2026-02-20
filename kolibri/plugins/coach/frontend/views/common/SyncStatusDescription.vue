<template>

  <p>
    {{ syncTextDisplayMap }}
  </p>

</template>


<script>

  import { SyncStatus } from 'kolibri/constants';

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
        message: 'The device has been recently synced with the class server.',
        context: 'Description of the device syncing status.',
      },
      syncingDescription: {
        message: 'The device is currently syncing.',
        context: 'Description of the device syncing status.',
      },
      queuedDescription: {
        message: 'The device is waiting to sync.',
        context: 'Description of the device syncing status',
      },
      unableOrNoSyncDescription: {
        message:
          "The problem could be that the device is connected to the server but hasn't recently synced. Or syncing was attempted but failed for some reason.",
        context: 'Description of the device syncing status.',
      },
      notConnectedDescription: {
        message: "The device isn't connected to a server it can be synced with.",
        context: 'Description of the device syncing status.',
      },
      insufficientStorageDescription: {
        message:
          'This device does not have enough storage for updates. Check the size of your visible lessons and quizzes. Making a lesson or quiz not visible will remove it from learner devices.',
        context: 'Description of the device syncing status.',
      },
    },
  };

</script>
