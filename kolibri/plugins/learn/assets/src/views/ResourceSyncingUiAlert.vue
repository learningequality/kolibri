<template>

  <MissingResourceAlert :multiple="multiple">
    <template
      v-if="isLearnerOnlyImport && isSyncing"
      #syncAlert
    >
      {{ syncMessage }}
    </template>
  </MissingResourceAlert>

</template>


<script>

  import { get } from '@vueuse/core';
  import { computed, watch } from 'vue';
  import MissingResourceAlert from 'kolibri-common/components/MissingResourceAlert.vue';
  import useUserSyncStatus from 'kolibri/composables/useUserSyncStatus';
  import { SyncStatus } from 'kolibri/constants';
  import { createTranslator } from 'kolibri/utils/i18n';
  import useUser from 'kolibri/composables/useUser';

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
    setup(props, { emit }) {
      const { status, syncDownloadsInProgress } = useUserSyncStatus();
      const { isLearnerOnlyImport } = useUser();
      const isSyncing = computed(() => {
        return (
          get(status) === SyncStatus.QUEUED ||
          get(status) === SyncStatus.SYNCING ||
          get(syncDownloadsInProgress)
        );
      });

      watch(isSyncing, (newVal, oldVal) => {
        if (newVal === false && oldVal === true) {
          emit('syncComplete');
        }
      });

      return {
        status,
        isLearnerOnlyImport,
        isSyncing,
      };
    },
    props: {
      multiple: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
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
