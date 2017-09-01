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

/*
 * Returns the 'default' channel ID:
 * - if there are channels and they match the cookie, return that
 * - else if there are channels, return the first one
 * - else return null
 *
 * Not truly a 'getter' because it doesn't use vuex state
 */
function getDefaultChannelId(channelList) {
  if (channelList && channelList.length) {
    const cookieVal = cookiejs.get('currentChannelId');
    if (channelList.some(channel => channel.id === cookieVal)) {
      return cookieVal;
    }
    return channelList[0].id;
  }
  return null;
}

function getCurrentChannelId(state) {
  return state.core.channels.currentId;
}

/* return the current channel object, according to vuex state */
function getCurrentChannelObject(state) {
  return state.core.channels.list.find(channel => channel.id === getCurrentChannelId(state));
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
  getDefaultChannelId,
  getCurrentChannelId,
  getCurrentChannelObject,
  currentFacilityId,
  totalPoints,
  contentPoints,
  currentUserId,
  facilityConfig,
  sessionTimeSpent,
};
