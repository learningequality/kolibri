/* eslint-disable prefer-arrow-callback */
const { ChannelResource, FileSummaryResource } = require('kolibri').resources;
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


/**
 * Hydrate the manage content pageState with channel file summary info
 *
 * @param store - vuex store object
 * @param {Array<String>} channelIds - an array of channelIds
 * @return {Promise}
 */
function addChannelFileSummaries(store, channelIds) {
  const promises = channelIds.map(channelId =>
    FileSummaryResource.getCollection({ channel_id: channelId })
  );
  return Promise.all(promises);
}

module.exports = {
  addChannelFileSummaries,
  deleteChannel,
};
