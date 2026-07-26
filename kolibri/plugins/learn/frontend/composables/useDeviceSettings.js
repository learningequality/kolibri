import { computed, ref } from 'vue';
import plugin_data from 'kolibri-plugin-data';
import store from '../store';

const allowDownloadOnMeteredConnection = ref(plugin_data.allowDownloadOnMeteredConnection);

export default function useDeviceSettings() {
  const allowGuestAccess = computed(() => store.getters.allowGuestAccess);
  const canAccessUnassignedContent = computed(() => store.getters.canAccessUnassignedContent);

  return {
    allowGuestAccess,
    canAccessUnassignedContent,
    allowDownloadOnMeteredConnection,
  };
}
