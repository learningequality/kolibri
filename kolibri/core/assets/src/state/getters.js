import some from 'lodash/some';
import { UserKinds, MaxPointsPerContent } from '../constants';

// ROLES
export function isAdmin(state) {
  return state.core.session.kind.includes(UserKinds.ADMIN);
}

export function isCoach(state) {
  return (
    state.core.session.kind.includes(UserKinds.COACH) ||
    state.core.session.kind.includes(UserKinds.ASSIGNABLE_COACH)
  );
}

export function isLearner(state) {
  return state.core.session.kind.includes(UserKinds.LEARNER);
}

export function isUserLoggedIn(state) {
  return !state.core.session.kind.includes(UserKinds.ANONYMOUS);
}

export function getUserKind(state) {
  if (isAdmin(state)) {
    return UserKinds.ADMIN;
  } else if (isCoach(state)) {
    return UserKinds.COACH;
  } else if (isLearner(state)) {
    return UserKinds.LEARNER;
  }
  return UserKinds.ANONYMOUS;
}

// PERMISSIONS
export function canManageContent(state) {
  return state.core.session.can_manage_content;
}

export function isSuperuser(state) {
  return state.core.session.kind.includes(UserKinds.SUPERUSER);
}

export function getUserPermissions(state) {
  const permissions = {};
  permissions.can_manage_content = state.core.session.can_manage_content;
  return permissions;
}

export function userHasPermissions(state) {
  return some(getUserPermissions(state));
}

export function currentFacilityId(state) {
  return state.core.session.facility_id;
}

export function currentUserId(state) {
  return state.core.session.user_id;
}

export function facilityConfig(state) {
  return state.core.facilityConfig;
}

export function facilities(state) {
  return state.core.facilities;
}

export function getChannels(state) {
  return state.core.channels.list;
}

/*
 * Not actually a getter, as it is not pure, defined here for convenience and use in actions
 */
export function getChannelObject(state, channelId) {
  return getChannels(state).find(channel => channel.id === channelId);
}

export function totalPoints(state) {
  return state.core.totalProgress * MaxPointsPerContent;
}

export function contentPoints(state) {
  return Math.floor(state.core.logging.summary.progress) * MaxPointsPerContent;
}

export function sessionTimeSpent(state) {
  return state.core.logging.session.time_spent;
}

export function connected(state) {
  return state.core.connection.connected;
}

export function reconnectTime(state) {
  return state.core.connection.reconnectTime;
}

export function snackbarIsVisible(state) {
  return state.core.snackbarIsVisible;
}

export function snackbarOptions(state) {
  return state.core.snackbarOptions;
}
