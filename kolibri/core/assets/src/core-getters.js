const UserKinds = require('./constants').UserKinds;
const cookiejs = require('js-cookie');


function isAdminOrSuperuser(state) {
  const kind = state.core.session.kind;
  if (kind[0] === UserKinds.SUPERUSER || kind[0] === UserKinds.ADMIN) {
    return true;
  }
  return false;
}


function isCoachAdminOrSuperuser(state) {
  const kind = state.core.session.kind;
  return [UserKinds.SUPERUSER, UserKinds.ADMIN, UserKinds.COACH].includes(kind[0]);
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
  isAdminOrSuperuser,
  isCoachAdminOrSuperuser,
  getDefaultChannelId,
  getCurrentChannelObject,
};
