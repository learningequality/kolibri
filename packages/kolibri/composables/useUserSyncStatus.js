import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Resource } from 'kolibri/apiResource';
import store from 'kolibri/store';
import { SyncStatus } from 'kolibri/constants';
import { get, useTimeoutPoll } from '@vueuse/core';
import useUser from 'kolibri/composables/useUser';

const UserSyncStatusResource = new Resource({
  name: 'usersyncstatus',
});

const { isLearnerOnlyImport, isUserLoggedIn, currentUserId } = useUser();

const status = ref(SyncStatus.NOT_CONNECTED);
const queued = ref(false);
const lastSynced = ref();
const deviceStatus = ref(null);
const deviceStatusSentiment = ref(null);
const hasDownloads = ref(false);
const lastDownloadRemoved = ref(null);
const syncDownloadsInProgress = ref(false);
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
      store.dispatch('handleApiError', { error });
      return error;
    },
  );
}

export function pollUserSyncStatusTask() {
  if (!get(isUserLoggedIn) || !get(isLearnerOnlyImport)) {
    return Promise.resolve();
  }
  return fetchUserSyncStatus({ user: get(currentUserId) }).then(syncData => {
    if (syncData && syncData[0]) {
      queued.value = syncData[0].queued;
      lastSynced.value = syncData[0].last_synced ? new Date(syncData[0].last_synced) : null;
      status.value = syncData[0].status;
      deviceStatus.value = syncData[0].device_status;
      deviceStatusSentiment.value = syncData[0].device_status_sentiment;
      hasDownloads.value = syncData[0].has_downloads;
      lastDownloadRemoved.value = syncData[0].last_download_removed
        ? new Date(syncData[0].last_download_removed)
        : null;
      syncDownloadsInProgress.value = syncData[0].sync_downloads_in_progress;
    } else {
      status.value = SyncStatus.NOT_CONNECTED;
    }
  });
}

export default function useUserSyncStatus() {
  onMounted(() => {
    usageCount.value++;
    if (usageCount.value === 1) {
      if (get(isUserLoggedIn) && get(isLearnerOnlyImport)) {
        pollUserSyncStatusTask();
      }
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
    hasDownloads,
    lastDownloadRemoved,
    syncDownloadsInProgress,
  };
}
