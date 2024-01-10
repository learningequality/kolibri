import { computed, ref } from 'kolibri.lib.vueCompositionApi';
import store from 'kolibri.coreVue.vuex.store';
import plugin_data from 'plugin_data';

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
