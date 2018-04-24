import { ChannelResource } from 'kolibri.resources';
import { canManageContent } from 'kolibri.coreVue.vuex.getters';

/**
 * Force-refresh the ChannelResource Collection
 *
 */
export function refreshChannelList(store) {
  store.dispatch('SET_CHANNEL_LIST_LOADING', true);
  return ChannelResource.getCollection()
    .fetch({ file_sizes: true }, true)
    .then(channels => {
      store.dispatch('SET_CHANNEL_LIST', channels);
      store.dispatch('SET_CHANNEL_LIST_LOADING', false);
    });
}

export function showManageContentPage(store) {
  store.dispatch('RESET_MANAGE_CONTENT_PAGESTATE');
  if (canManageContent(store.state)) {
    return refreshChannelList(store);
  }
  return Promise.resolve();
}
