import { ref, onMounted, onUnmounted, computed } from 'kolibri.lib.vueCompositionApi';
import { UserSyncStatusResource } from 'kolibri.resources';
import store from 'kolibri.coreVue.vuex.store';

const queued = ref(false);
const lastSynced = ref();
const status = ref();
const deviceStatus = ref(null);
const deviceStatusSentiment = ref(null);

const usageCount = ref(0);
const timeoutId = ref(null);

export function useUser() {
  const isUserLoggedIn = computed(() => store.getters.isUserLoggedIn);
  // const isUserLoggedIn = computed(() => store.getters.param.user_id);
  return {
    isUserLoggedIn,
  };
}

export function fetchUserSyncStatus(store, param) {
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
  //const isUserLoggedIn = computed(() => store.getters.isUserLoggedIn);

  fetchUserSyncStatus({ user: store.state.core.session.user_id }).then(syncData => {
    console.log(syncData);
    console.log(store.state.core.session.user_id);
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

  // timeoutId.value = setTimeout(
  //   () => {
  //     pollUserSyncStatusTask();
  //   },
  //   queued.value ? 1000 : 10000
  // );
  return {
    queued,
    lastSynced,
    status,
    deviceStatus,
    deviceStatusSentiment,
  };
}

export function useUserSyncStatus() {
  onMounted(() => {
    usageCount.value++;

    if (usageCount.value === 1) {
      // Blaine: looks like you want to call `pollUserSyncStatusTask`
      //   and pass only `userId`
      // startFetchUserSyncStatus({ user_id: this.useUser });
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
