import { ref, onMounted, onUnmounted } from 'kolibri.lib.vueCompositionApi';
import { UserSyncStatusResource } from 'kolibri.resources';

const queued = ref(false);
const lastSynced = ref(null);
const status = ref(null);
const deviceStatus = ref(null);
const deviceStatusSentiment = ref(null);

const usageCount = ref(0);
const timeoutId = ref(null);

export default function pollUserSyncStatusTask(user_id) {
  fetchUserSyncStatus({ user: user_id }).then(syncData => {
    if (syncData && syncData[0]) {
      queued.value = syncData[0].queued;
      lastSynced.value = syncData[0].last_synced;
      status.value = syncData[0].status;
      deviceStatus.value = syncData[0].device_status;
      deviceStatusSentiment.value = syncData[0].device_status_sentiment;
    }
  });
  // Blaine: the variables in this `if` statement aren't defined. Let's make sure not to use this
  // Blaine: composable if `this.isSubsetOfUsersDevice` is false in the component we'll use it in.
  // Blaine: So I think we can remove this `if` statement, and directly set the timeout

  timeoutId.value = setTimeout(
    () => {
      pollUserSyncStatusTask();
    },
    queued.value ? 1000 : 10000
  );
}

export function fetchUserSyncStatus(store, param) {
  // Blaine: like we said during our call, these two cases are
  //    very similar, so you can remove one...
  // Blaine: remove the `if` statement and have one call to
  //   `UserSyncStatusResource.fetchCollection`

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

export function useUserSyncStatus() {
  onMounted(() => {
    usageCount.value++;
    if (usageCount.value === 1) {
      // Blaine: looks like you want to call `pollUserSyncStatusTask`
      //   and pass only `userId`
      //   startFetchUserSyncStatus({ user_id: userId });
    }
  });

  onUnmounted(() => {
    usageCount.value--;
    if (usageCount.value === 0) {
      clearTimeout(timeoutId.value);
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
