import { useTimeoutPoll } from '@vueuse/core';
import { getCurrentInstance, onMounted, onUnmounted } from 'vue';
import useUser from 'kolibri/composables/useUser';

export default function useContentTasks() {
  const $store = getCurrentInstance().proxy.$store;
  const { canManageContent } = useUser();

  const polling = useTimeoutPoll(() => {
    return $store.dispatch('manageContent/refreshTaskList');
  }, 5000);

  function startTaskPolling() {
    if (canManageContent.value) {
      polling.resume();
    }
  }
  function stopTaskPolling() {
    polling.pause();
  }

  onMounted(startTaskPolling);
  onUnmounted(polling.pause);

  return {
    stopTaskPolling,
    startTaskPolling,
  };
}
