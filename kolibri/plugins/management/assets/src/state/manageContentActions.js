/* eslint-disable prefer-arrow-callback */
const { ChannelResource } = require('kolibri').resources;
/**
 * Delete a Channel from the device
 * @param store - vuex store object
 * @param {string} channelId - a valid channel UUID
 * @returns {Promise}
 */
function deleteChannel(store, channelId) {
  return ChannelResource.getModel(channelId).delete()
    .then(function onSuccess(msg) {
      // force an update of the channel list
      console.log('deleted ', msg);
    });
}

module.exports = {
  deleteChannel,
};
