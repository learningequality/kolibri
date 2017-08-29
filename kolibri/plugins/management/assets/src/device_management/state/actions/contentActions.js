import { ChannelResource } from 'kolibri.resources';
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
      channelList: [],
      wizardState: {
        shown: false,
      },
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
