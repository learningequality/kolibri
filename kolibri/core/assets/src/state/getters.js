const UserKinds = require('../constants').UserKinds;
const cookiejs = require('js-cookie');


function isUserLoggedIn(state) {
  return state.core.session.kind[0] !== UserKinds.ANONYMOUS;
}


function isSuperuser(state) {
  return state.core.session.kind[0] === UserKinds.SUPERUSER;
}


function isAdmin(state) {
  return state.core.session.kind[0] === UserKinds.ADMIN;
}


function isCoach(state) {
  return state.core.session.kind[0] === UserKinds.COACH;
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
    if (channelList.some((channel) => channel.id === cookieVal)) {
      return cookieVal;
    }
    return channelList[0].id;
  }
  return null;
}

/* return the current channel object, according to vuex state */
function getCurrentChannelObject(state) {
  return state.core.channels.list.find(channel => channel.id === state.core.channels.currentId);
}


module.exports = {
  isUserLoggedIn,
  isSuperuser,
  isAdmin,
  isCoach,
  getDefaultChannelId,
  getCurrentChannelObject,
};
