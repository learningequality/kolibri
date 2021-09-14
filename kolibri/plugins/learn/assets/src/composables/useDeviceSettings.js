import { computed } from 'kolibri.lib.vueCompositionApi';
import store from 'kolibri.coreVue.vuex.store';

export default function useDeviceSettings() {
  const allowGuestAccess = computed(() => store.getters.allowGuestAccess);
  const canAccessUnassignedContent = computed(() => store.getters.canAccessUnassignedContent);

  return {
    allowGuestAccess,
    canAccessUnassignedContent,
  };
}
