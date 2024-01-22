import { computed } from 'kolibri.lib.vueCompositionApi';
import store from 'kolibri.coreVue.vuex.store';

export default function useUser() {
<<<<<<< HEAD
  const isLearnerOnlyImport = computed(() => store.getters['session/isLearnerOnlyImport']);
  const isUserLoggedIn = computed(() => store.getters['session/isUserLoggedIn']);
  const currentUserId = computed(() => store.getters['session/currentUserId']);
  const isCoach = computed(() => store.getters['session/isCoach']);
  const isAdmin = computed(() => store.getters['session/isAdmin']);
  const isSuperuser = computed(() => store.getters['session/isSuperuser']);
  const canManageContent = computed(() => store.getters['session/canManageContent']);
  // Additional computed properties based on 'session.js'
  const isAppContext = computed(() => store.getters['session/isAppContext']);
  const sessionIsLearnerOnlyImport = computed(() => store.getters['session/isLearnerOnlyImport']);
  const sessionIsUserLoggedIn = computed(() => store.getters['session/isUserLoggedIn']);
  const sessionCurrentUserId = computed(() => store.getters['session/currentUserId']);
  const sessionIsCoach = computed(() => store.getters['session/isCoach']);
  const sessionIsAdmin = computed(() => store.getters['session/isAdmin']);
  const sessionIsSuperuser = computed(() => store.getters['session/isSuperuser']);
  const sessionCanManageContent = computed(() => store.getters['session/canManageContent']);
=======
  const isUserLoggedIn = computed(() => store.getters.isUserLoggedIn);
  const currentUserId = computed(() => store.getters.currentUserId);
  const isLearnerOnlyImport = computed(() => store.getters.isLearnerOnlyImport);
  const isCoach = computed(() => store.getters.isCoach);
  const isAdmin = computed(() => store.getters.isAdmin);
  const isSuperuser = computed(() => store.getters.isSuperuser);
  const canManageContent = computed(() => store.getters.canManageContent);
  const isAppContext = computed(() => store.getters.isAppContext);
>>>>>>> e80feb9f18bca04083cc8d14c860e823dedd22ab

  return {
    isLearnerOnlyImport,
    isUserLoggedIn,
    currentUserId,
    isCoach,
    isAdmin,
    isSuperuser,
    canManageContent,
<<<<<<< HEAD
    // Additional computed properties 
    isAppContext,
    sessionIsLearnerOnlyImport,
    sessionIsUserLoggedIn,
    sessionCurrentUserId,
    sessionIsCoach,
    sessionIsAdmin,
    sessionIsSuperuser,
    sessionCanManageContent,
=======
    isAppContext,
>>>>>>> e80feb9f18bca04083cc8d14c860e823dedd22ab
  };
}
