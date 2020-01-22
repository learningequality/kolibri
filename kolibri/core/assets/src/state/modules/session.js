import some from 'lodash/some';
import { UserKinds } from '../../constants';

export const baseSessionState = {
  can_manage_content: false,
  can_access_unassigned_content: false,
  facility_id: undefined,
  full_name: '',
  id: undefined,
  kind: [UserKinds.ANONYMOUS],
  user_id: undefined,
  username: '',
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
    canAccessUnassignedContent(state) {
      return state.can_access_unassigned_content;
    },
    isSuperuser(state) {
      return state.kind.includes(UserKinds.SUPERUSER);
    },
    getUserPermissions(state) {
      const permissions = {};
      permissions.can_manage_content = state.can_manage_content;
      return permissions;
    },
    currentFacilityId(state) {
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
  },
  mutations: {
    CORE_SET_SESSION(state, value) {
      Object.assign(state, value);
    },
  },
};
