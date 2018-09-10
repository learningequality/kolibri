import { canManageContent } from 'kolibri.coreVue.vuex.getters';
import ChannelResource from '../../apiResources/deviceChannel';

/**
 * Force-refresh the ChannelResource Collection
 *
 */
export function refreshChannelList(store) {
  store.dispatch('SET_CHANNEL_LIST_LOADING', true);
  return ChannelResource.getCollection()
    .fetch({ include_fields: 'on_device_file_size' }, true)
    .then(channels => {
      store.dispatch('SET_CHANNEL_LIST', [...channels]);
      store.dispatch('SET_CHANNEL_LIST_LOADING', false);
      return [...channels];
    });
}

export function showManageContentPage(store) {
  store.dispatch('RESET_MANAGE_CONTENT_PAGESTATE');
  if (canManageContent(store.state)) {
    return refreshChannelList(store);
  }
  return Promise.resolve();
}

export function setToolbarTitle(store, newTitle) {
  store.dispatch('SET_TOOLBAR_TITLE', newTitle);
}
