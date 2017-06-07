/* eslint-disable prefer-arrow-callback */
const { ChannelResource, FileSummaryResource } = require('kolibri').resources;

const namespace = 'MANAGE_CONTENT';

const actionTypes = {
  ADD_CHANNEL_FILE_SUMMARIES: `${namespace}/ADD_CHANNEL_FILE_SUMMARIES`,
  REMOVE_CHANNEL: `${namespace}/REMOVE_CHANNEL`,
};

/**
 * Delete a Channel from the device
 * @param store - vuex store object
 * @param {string} channelId - a valid channel UUID
 * @returns {Promise}
 */
function deleteChannel(store, channelId) {
  return ChannelResource.getModel(channelId).delete()
  .then(function onSuccess(msg) {
    store.dispatch(actionTypes.REMOVE_CHANNEL, channelId);
  });
}

/**
 * Hydrate the manage content pageState with channel file summary info
 *
 * @param store - vuex store object
 * @param {Array<String>} channelIds - an array of channelIds
 * @return {Promise<Array<FileSummary>>}
 */
function addChannelFileSummaries(store, channelIds) {
  const promises = channelIds.map(channelId =>
    FileSummaryResource.getCollection({ channel_id: channelId }).fetch()
  );
  return Promise.all(promises)
  .then(function onSuccess(data) {
    store.dispatch(actionTypes.ADD_CHANNEL_FILE_SUMMARIES, data);
  });
}

module.exports = {
  actionTypes,
  addChannelFileSummaries,
  deleteChannel,
};
