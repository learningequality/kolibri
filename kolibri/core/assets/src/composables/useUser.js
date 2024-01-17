import { computed } from 'kolibri.lib.vueCompositionApi';
import store from 'kolibri.coreVue.vuex.store';

export default function useUser() {
  const isLearnerOnlyImport = computed(() => store.getters['session/isLearnerOnlyImport']);
  const isUserLoggedIn = computed(() => store.getters['session/isUserLoggedIn']);
  const currentUserId = computed(() => store.getters['session/currentUserId']);
  const isCoach = computed(() => store.getters['session/isCoach']);
  const isAdmin = computed(() => store.getters['session/isAdmin']);
  const isSuperuser = computed(() => store.getters['session/isSuperuser']);
  const canManageContent = computed(() => store.getters['session/canManageContent']);

  return {
    isLearnerOnlyImport,
    isUserLoggedIn,
    currentUserId,
    isCoach,
    isAdmin,
    isSuperuser,
    canManageContent,
  };
}
