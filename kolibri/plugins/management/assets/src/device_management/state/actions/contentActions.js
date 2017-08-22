import { ChannelResource, FileSummaryResource } from 'kolibri.resources';
import { mutationTypes } from '../../../state/manageContentMutations';

/**
 * Force-refresh the ChannelResource Collection
 *
 */
export function refreshChannelList() {
  return ChannelResource.getCollection().fetch({}, true);
}

/**
 * Delete a Channel from the device
 *
 * @param {Object} store - vuex store object
 * @param {string} channelId - a valid channel UUID
 * @returns {Promise}
 */
export function deleteChannel(store, channelId) {
  return ChannelResource.getModel(channelId)
    .delete()
    .then(() => {
      store.dispatch(mutationTypes.REMOVE_CHANNEL_FILE_SUMMARY, channelId);
    })
    .then(refreshChannelList);
}

/**
 * Request and hydrate pageState with file summary info for single channel
 *
 * @param {Object} store - vuex store object
 * @param {string} channelId - channel UUID
 * @returns {Promise}
 */
export function addChannelFileSummary(store, channelId) {
  return (
    FileSummaryResource.getCollection({ channel_id: channelId })
      .fetch()
      // FileSummary response is wrapped in an array as workaround on server side
      .then(function onSuccess([data]) {
        store.dispatch(mutationTypes.ADD_CHANNEL_FILE_SUMMARY, data);
      })
      .catch(function onFailure(err) {
        console.error(err); // eslint-disable-line
      })
  );
}

/**
 * Hydrate the manage content pageState with file summary info for all channels.
 * Requests for individual channels are non-blocking.
 *
 * @param {Object} store - vuex store object
 * @param {Array<String>} channelIds - an array of channelIds
 * @return {undefined}
 */
export function addChannelFileSummaries(store, channelIds) {
  channelIds.forEach(channelId => {
    if (store.state.pageState[channelId]) return;
    addChannelFileSummary(store, channelId);
  });
}
