import { useIntervalFn } from '@vueuse/core';
import { getCurrentInstance, onMounted, onUnmounted } from 'kolibri.lib.vueCompositionApi';
import useUser from 'kolibri.coreVue.composables.useUser';

export default function useContentTasks() {
  const $store = getCurrentInstance().proxy.$store;
  const { canManageContent } = useUser();

  const polling = useIntervalFn(() => {
    $store.dispatch('manageContent/refreshTaskList');
  }, 1000);

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
