import { ChannelResource } from 'kolibri.resources';

/**
 * Force-refresh the ChannelResource Collection
 *
 */
export function refreshChannelList(store) {
  store.commit('SET_CHANNEL_LIST_LOADING', true);
  return ChannelResource.getCollection({ include_fields: 'on_device_file_size' })
    .fetch(true)
    .then(channels => {
      store.commit('SET_CHANNEL_LIST', [...channels]);
      store.commit('SET_CHANNEL_LIST_LOADING', false);
      return [...channels];
    });
}

export function showManageContentPage(store) {
  store.commit('RESET_MANAGE_CONTENT_PAGESTATE');
  if (store.getters.canManageContent) {
    return refreshChannelList(store);
  }
  return Promise.resolve();
}

export function setToolbarTitle(store, newTitle) {
  store.commit('SET_TOOLBAR_TITLE', newTitle);
}
