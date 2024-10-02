import some from 'lodash/some';
import { UserKinds } from 'kolibri/constants';

export const baseSessionState = {
  app_context: false,
  can_manage_content: false,
  facility_id: undefined,
  full_name: '',
  id: undefined,
  kind: [UserKinds.ANONYMOUS],
  user_id: undefined,
  username: '',
  full_facility_import: true,
};

export default {
  state: { ...baseSessionState },
  getters: {
    isAdmin(state) {
      return state.kind.includes(UserKinds.ADMIN) || state.kind.includes(UserKinds.SUPERUSER);
    },
    isCoach(state) {
      return (
        state.kind.includes(UserKinds.COACH) || state.kind.includes(UserKinds.ASSIGNABLE_COACH)
      );
    },
    isClassCoach(state) {
      return state.kind.includes(UserKinds.ASSIGNABLE_COACH);
    },
    isFacilityCoach(state) {
      return state.kind.includes(UserKinds.COACH);
    },
    isLearner(state) {
      return state.kind.includes(UserKinds.LEARNER);
    },
    isUserLoggedIn(state) {
      return !state.kind.includes(UserKinds.ANONYMOUS);
    },
    canManageContent(state) {
      return state.can_manage_content;
    },
    isSuperuser(state) {
      return state.kind.includes(UserKinds.SUPERUSER);
    },
    isFacilityAdmin(state) {
      return state.kind.includes(UserKinds.ADMIN);
    },
    // An "Multi-Facility Admin" is a superuser for a device with 2+ facilities
    userIsMultiFacilityAdmin(state, getters, rootState) {
      return getters.isSuperuser && rootState.core.facilities.length > 1;
    },
    getUserPermissions(state) {
      const permissions = {};
      permissions.can_manage_content = state.can_manage_content;
      return permissions;
    },
    userFacilityId(state) {
      return state.facility_id;
    },
    currentUserId(state) {
      return state.user_id;
    },
    getUserKind(state, getters) {
      if (getters.isSuperuser) {
        return UserKinds.SUPERUSER;
      } else if (getters.isAdmin) {
        return UserKinds.ADMIN;
      } else if (getters.isCoach) {
        return UserKinds.COACH;
      } else if (getters.isLearner) {
        return UserKinds.LEARNER;
      }
      return UserKinds.ANONYMOUS;
    },
    userHasPermissions(state, getters) {
      return some(getters.getUserPermissions);
    },
    session(state) {
      return state;
    },
    isAppContext(state) {
      return state.app_context;
    },
    isLearnerOnlyImport(state) {
      return !state.full_facility_import;
    },
  },
  mutations: {
    CORE_SET_SESSION(state, value) {
      Object.assign(state, value);
    },
  },
};
