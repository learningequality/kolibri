<template>

  <MissingResourceAlert
    :multiple="multiple"
  >
    <template v-if="isLearnerOnlyImport && (isSyncing || syncDownloadsInProgress)" #syncAlert>
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
      const { status, syncDownloadsInProgress } = useUserSyncStatus();
      const { isLearnerOnlyImport } = useUser();
      return {
        status,
        syncDownloadsInProgress,
        isLearnerOnlyImport,
      };
    },
    props: {
      multiple: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
      isSyncing() {
        return this.status == SyncStatus.QUEUED || this.status == SyncStatus.SYNCING;
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
