import { computed } from 'kolibri.lib.vueCompositionApi';
import store from 'kolibri.coreVue.vuex.store';

export default function useUser() {
  const isUserLoggedIn = computed(() => store.getters.isUserLoggedIn);
  const isLearnerOnlyImport = computed(() => store.getters.isLearnerOnlyImport);

  return {
    isLearnerOnlyImport,
    isUserLoggedIn,
  };
}
