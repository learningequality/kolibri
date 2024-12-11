import { computed } from 'vue';
import store from 'kolibri/store';

export default function useUser() {
  //getters
  const isUserLoggedIn = computed(() => store.getters.isUserLoggedIn);
  const currentUserId = computed(() => store.getters.currentUserId);
  const isLearnerOnlyImport = computed(() => store.getters.isLearnerOnlyImport);
  const isCoach = computed(() => store.getters.isCoach);
  const isAdmin = computed(() => store.getters.isAdmin);
  const isSuperuser = computed(() => store.getters.isSuperuser);
  const canManageContent = computed(() => store.getters.canManageContent);
  const isAppContext = computed(() => store.getters.isAppContext);
  const isClassCoach = computed(() => store.getters.isClassCoach);
  const isFacilityCoach = computed(() => store.getters.isFacilityCoach);
  const isLearner = computed(() => store.getters.isLearner);
  const isFacilityAdmin = computed(() => store.getters.isFacilityAdmin);
  const userIsMultiFacilityAdmin = computed(() => store.getters.userIsMultiFacilityAdmin);
  const getUserPermissions = computed(() => store.getters.getUserPermissions);
  const userFacilityId = computed(() => store.getters.userFacilityId);
  const getUserKind = computed(() => store.getters.getUserKind);
  const userHasPermissions = computed(() => store.getters.userHasPermissions);
  const session = computed(() => store.getters.session);

  //state
  const app_context = computed(() => store.getters.session.app_context);
  const can_manage_content = computed(() => store.getters.session.can_manage_content);
  const facility_id = computed(() => store.getters.session.facility_id);
  const full_name = computed(() => store.getters.session.full_name);
  const id = computed(() => store.getters.session.id);
  const kind = computed(() => store.getters.session.kind);
  const user_id = computed(() => store.getters.session.user_id);
  const full_facility_import = computed(() => store.getters.session.full_facility_import);
  const username = computed(() => store.getters.session.username);

  return {
    isLearnerOnlyImport,
    isUserLoggedIn,
    currentUserId,
    isCoach,
    isAdmin,
    isSuperuser,
    canManageContent,
    isAppContext,
    isClassCoach,
    isFacilityCoach,
    isLearner,
    isFacilityAdmin,
    userIsMultiFacilityAdmin,
    getUserPermissions,
    userFacilityId,
    getUserKind,
    userHasPermissions,
    session,
    //state
    app_context,
    can_manage_content,
    facility_id,
    full_name,
    id,
    kind,
    user_id,
    username,
    full_facility_import,
  };
}
