const UserKinds = require('./constants').UserKinds;
const cookiejs = require('js-cookie');


function isAdminOrSuperuser(state) {
  const kind = state.core.session.kind;
  if (kind[0] === UserKinds.SUPERUSER || kind[0] === UserKinds.ADMIN) {
    return true;
  }
  return false;
}


/*
 * Returns the 'default' channel ID:
 * - if there are channels and they match the cookie, return that
 * - else if there are channels, return the first one
 * - else return null
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


module.exports = {
  isAdminOrSuperuser,
  getDefaultChannelId,
};
