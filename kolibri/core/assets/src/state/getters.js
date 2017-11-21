import { UserKinds, MaxPointsPerContent } from '../constants';
import some from 'lodash/some';

// ROLES
function isAdmin(state) {
  return state.core.session.kind.includes(UserKinds.ADMIN);
}

function isCoach(state) {
  return state.core.session.kind.includes(UserKinds.COACH);
}

function isLearner(state) {
  return state.core.session.kind.includes(UserKinds.LEARNER);
}

function isUserLoggedIn(state) {
  return !state.core.session.kind.includes(UserKinds.ANONYMOUS);
}

function getUserRole(state) {
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
function canManageContent(state) {
  return state.core.session.can_manage_content;
}
function isSuperuser(state) {
  return state.core.session.kind.includes(UserKinds.SUPERUSER);
}
function getUserPermissions(state) {
  const permissions = {};
  permissions.can_manage_content = state.core.session.can_manage_content;
  return permissions;
}

function userHasPermissions(state) {
  return some(getUserPermissions(state));
}

function currentFacilityId(state) {
  return state.core.session.facility_id;
}

function currentUserId(state) {
  return state.core.session.user_id;
}

function facilityConfig(state) {
  return state.core.facilityConfig;
}

function getChannels(state) {
  return state.core.channels.list;
}

/*
 * Not actually a getter, as it is not pure, defined here for convenience and use in actions
 */
function getChannelObject(state, channelId) {
  return getChannels(state).find(channel => channel.id === channelId);
}

function totalPoints(state) {
  return state.core.totalProgress * MaxPointsPerContent;
}

function contentPoints(state) {
  return Math.floor(state.core.logging.summary.progress) * MaxPointsPerContent;
}

function sessionTimeSpent(state) {
  return state.core.logging.session.time_spent;
}

function connected(state) {
  return state.core.connection.connected;
}

function reconnectTime(state) {
  return state.core.connection.reconnectTime;
}

function currentSnackbar(state) {
  return state.core.currentSnackbar;
}

export {
  isUserLoggedIn,
  isSuperuser,
  isAdmin,
  isCoach,
  isLearner,
  getChannels,
  getChannelObject,
  currentFacilityId,
  totalPoints,
  contentPoints,
  currentUserId,
  facilityConfig,
  sessionTimeSpent,
  canManageContent,
  getUserRole,
  getUserPermissions,
  userHasPermissions,
  connected,
  reconnectTime,
  currentSnackbar,
};
