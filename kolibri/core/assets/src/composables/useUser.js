import { computed } from 'kolibri.lib.vueCompositionApi';
import store from 'kolibri.coreVue.vuex.store';

export default function useUser() {
  const isUserLoggedIn = computed(() => store.getters.isUserLoggedIn);
  const currentUserId = computed(() => store.getters.currentUserId);
  const isLearnerOnlyImport = computed(() => store.getters.isLearnerOnlyImport);
  const isCoach = computed(() => store.getters.isCoach);
  const isAdmin = computed(() => store.getters.isAdmin);
  const isSuperuser = computed(() => store.getters.isSuperuser);
  const canManageContent = computed(() => store.getters.canManageContent);
  const isAppContext = computed(() => store.getters.isAppContext);

  return {
    isLearnerOnlyImport,
    isUserLoggedIn,
    currentUserId,
    isCoach,
    isAdmin,
    isSuperuser,
    canManageContent,
    isAppContext,
  };
}
