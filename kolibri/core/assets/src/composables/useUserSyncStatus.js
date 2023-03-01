import { ref, onMounted, onUnmounted, computed } from 'kolibri.lib.vueCompositionApi';
import { UserSyncStatusResource } from 'kolibri.resources';
import store from 'kolibri.coreVue.vuex.store';
import { useTimeoutPoll } from '@vueuse/core';

const status = ref(null);
const queued = ref(false);
const lastSynced = ref();
const deviceStatus = ref(null);
const deviceStatusSentiment = ref(null);
const { pause, resume } = useTimeoutPoll(pollUserSyncStatusTask, 1000);

const usageCount = ref(0);

export function useUser() {
  const isUserLoggedIn = computed(() => store.getters.isUserLoggedIn);

  return {
    isUserLoggedIn,
  };
}

export function fetchUserSyncStatus() {
  const param = computed(() => store.state.core.session.user_id);
  return UserSyncStatusResource.fetchCollection({
    force: true,
    getParams: param,
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
  fetchUserSyncStatus({ user: store.state.core.session.user_id }).then(syncData => {
    if (syncData && syncData[0]) {
      queued.value = syncData[0].queued;
      lastSynced.value = syncData[0].last_synced;
      status.value = syncData[0].status;
      deviceStatus.value = syncData[0].device_status;
      deviceStatusSentiment.value = syncData[0].device_status_sentiment;
    }
    return syncData;
  });
}

export function useUserSyncStatus() {
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
