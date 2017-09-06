import { UserKinds, MaxPointsPerContent } from '../constants';
import cookiejs from 'js-cookie';

function isUserLoggedIn(state) {
  return state.core.session.kind[0] !== UserKinds.ANONYMOUS;
}

function isSuperuser(state) {
  return state.core.session.kind[0] === UserKinds.SUPERUSER;
}

function isFacilityUser(state) {
  return isUserLoggedIn(state) && !isSuperuser(state);
}

function isAdmin(state) {
  return state.core.session.kind[0] === UserKinds.ADMIN;
}

function isCoach(state) {
  return state.core.session.kind[0] === UserKinds.COACH;
}

function isLearner(state) {
  return state.core.session.kind[0] === UserKinds.LEARNER;
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

function getCurrentChannelId(state) {
  return state.core.channels.currentId;
}

/* return the current channel object, according to vuex state */
function getCurrentChannelObject(state) {
  return getChannelObject(getCurrentChannelId(state));
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

export {
  isUserLoggedIn,
  isSuperuser,
  isFacilityUser,
  isAdmin,
  isCoach,
  isLearner,
  getChannels,
  getChannelObject,
  getCurrentChannelId,
  getCurrentChannelObject,
  currentFacilityId,
  totalPoints,
  contentPoints,
  currentUserId,
  facilityConfig,
  sessionTimeSpent,
};
