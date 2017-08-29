import { ChannelResource, FileSummaryResource } from 'kolibri.resources';
import { canManageContent } from 'kolibri.coreVue.vuex.getters';
import { handleApiError, setChannelInfo } from 'kolibri.coreVue.vuex.actions';
import { fetchCurrentTasks } from './taskActions';

/**
 * Force-refresh the ChannelResource Collection
 *
 */
export function refreshChannelList(store) {
 return ChannelResource.getCollection().fetch({ file_sizes: true }, true).then(channels => {
   store.dispatch('SET_CONTENT_PAGE_CHANNELS', channels);
 });
}

export function showManageContentPage(store) {
  if (canManageContent(store.state)) {
    store.dispatch('SET_CONTENT_PAGE_STATE', {
      taskList: [],
      wizardState: { shown: false },
      channelFileSummaries: {},
    });

    setChannelInfo(store);

    return fetchCurrentTasks(store)
      .then(function onSuccess(taskList) {
        store.dispatch('SET_CONTENT_PAGE_TASKS', taskList);
      })
      .catch(function onFailure(error) {
        handleApiError(store, error);
      });
  }
  return Promise.resolve();
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
    .then(() => refreshChannelList(store));
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
        store.dispatch('ADD_CHANNEL_FILE_SUMMARY', data);
      })
      .catch(function onFailure(error) {
        console.error(error); // eslint-disable-line
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
    if (store.state.pageState.channelFileSummaries[channelId]) return;
    addChannelFileSummary(store, channelId);
  });
}
