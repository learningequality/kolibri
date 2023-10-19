<template>

  <MissingResourceAlert
    v-if="isSyncing || syncCouldNotComplete"
    :syncCouldNotComplete="syncCouldNotComplete"
  >
    <template v-if="isSyncing && isLearnerOnlyImport" #syncAlert>
      {{ syncMessage }}
    </template>
  </MissingResourceAlert>

</template>


<script>

  import MissingResourceAlert from 'kolibri-common/components/MissingResourceAlert.vue';
  import useUserSyncStatus from 'kolibri.coreVue.composables.useUserSyncStatus';
  import { SyncStatus } from 'kolibri.coreVue.vuex.constants';
  import { createTranslator } from 'kolibri.utils.i18n';
  import useUser from 'kolibri.coreVue.composables.useUser';

  const syncStatusDescriptionStrings = createTranslator('SyncStatusDescription', {
    syncingDescription: {
      message: 'The device is currently syncing.',
      context: 'Description of the device syncing status.',
    },
    queuedDescription: {
      message: 'The device is waiting to sync.',
      context: 'Description of the device syncing status',
    },
  });

  export default {
    name: 'ResourceSyncingUiAlert',
    components: {
      MissingResourceAlert,
    },
    setup() {
      const { status } = useUserSyncStatus();
      const { isLearnerOnlyImport } = useUser();
      return {
        status,
        isLearnerOnlyImport,
      };
    },
    computed: {
      isSyncing() {
        return this.status == SyncStatus.QUEUED || this.status == SyncStatus.SYNCING;
      },
      syncCouldNotComplete() {
        console.log(this.status);
        return (
          this.status == SyncStatus.UNABLE_TO_SYNC ||
          this.status == SyncStatus.INSUFFICIENT_STORAGE ||
          this.status == SyncStatus.NOT_CONNECTED
        );
      },
      syncMessage() {
        /* eslint-disable kolibri/vue-no-undefined-string-uses */
        return this.status == SyncStatus.QUEUED
          ? syncStatusDescriptionStrings.$tr('queuedDescription')
          : syncStatusDescriptionStrings.$tr('syncingDescription');
        /* eslint-enable */
      },
    },
  };

</script>
