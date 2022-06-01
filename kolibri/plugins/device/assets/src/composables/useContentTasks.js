import { useIntervalFn } from '@vueuse/core';
import { getCurrentInstance, onMounted, onUnmounted } from 'kolibri.lib.vueCompositionApi';

export default function useContentTasks() {
  const $store = getCurrentInstance().proxy.$store;

  const polling = useIntervalFn(() => {
    $store.dispatch('manageContent/refreshTaskList');
  }, 1000);

  function startTaskPolling() {
    if ($store.getters.canManageContent) {
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
