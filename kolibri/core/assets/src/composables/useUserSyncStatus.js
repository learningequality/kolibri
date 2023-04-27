import { ref, onMounted, onUnmounted, computed } from 'kolibri.lib.vueCompositionApi';
import { UserSyncStatusResource } from 'kolibri.resources';
import store from 'kolibri.coreVue.vuex.store';
import { SyncStatus } from 'kolibri.coreVue.vuex.constants';
import { get, useTimeoutPoll } from '@vueuse/core';

const status = ref(SyncStatus.NOT_CONNECTED);
const queued = ref(false);
const lastSynced = ref();
const deviceStatus = ref(null);
const deviceStatusSentiment = ref(null);
const timeoutInterval = computed(() => {
  return get(status) === SyncStatus.QUEUED ? 1000 : 10000;
});
const { pause, resume } = useTimeoutPoll(pollUserSyncStatusTask, timeoutInterval);

const usageCount = ref(0);

export function fetchUserSyncStatus(params) {
  return UserSyncStatusResource.fetchCollection({
    force: true,
    getParams: params,
  }).then(
    syncData => {
      return syncData;
    },
    error => {
      store.dispatch('handleApiError', error);
      return error;
    }
  );
}

export function pollUserSyncStatusTask() {
  if (!store.state.core.session.user_id) {
    return Promise.resolve();
  }

  return fetchUserSyncStatus({ user: store.state.core.session.user_id }).then(syncData => {
    if (syncData && syncData[0]) {
      queued.value = syncData[0].queued;
      lastSynced.value = syncData[0].last_synced ? new Date(syncData[0].last_synced) : null;
      status.value = syncData[0].status;
      deviceStatus.value = syncData[0].device_status;
      deviceStatusSentiment.value = syncData[0].device_status_sentiment;
    } else {
      status.value = SyncStatus.NOT_CONNECTED;
    }
  });
}

export default function useUserSyncStatus() {
  onMounted(() => {
    usageCount.value++;
    if (usageCount.value === 1) {
      resume();
    }
  });

  onUnmounted(() => {
    usageCount.value--;
    if (usageCount.value === 0) {
      pause();
    }
  });

  return {
    queued,
    lastSynced,
    status,
    deviceStatus,
    deviceStatusSentiment,
  };
}
