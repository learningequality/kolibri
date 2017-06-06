const { ChannelResource } = require('kolibri').resources;
/**
 * Delete a Channel from the device
 * @param store - vuex store object
 * @param {string} channelId - a valid channel UUID
 * @returns {Promise}
 */
function deleteChannel(store, channelId) {
  return ChannelResource.getModel(channelId).delete()
    .then((msg) => {
      console.log('deleted ', msg);
    });
}

module.exports = {
  deleteChannel,
};
