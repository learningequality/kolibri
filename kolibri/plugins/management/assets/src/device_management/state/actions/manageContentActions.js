import { ChannelResource } from 'kolibri.resources';
import { canManageContent } from 'kolibri.coreVue.vuex.getters';

/**
 * Force-refresh the ChannelResource Collection
 *
 */
export function refreshChannelList(store) {
  return ChannelResource.getCollection()
    .fetch({ file_sizes: true }, true)
    .then(channels => {
      store.dispatch('SET_CHANNEL_LIST', channels);
    });
}

export function showManageContentPage(store) {
  if (canManageContent(store.state)) {
    store.dispatch('RESET_MANAGE_CONTENT_PAGESTATE');
    return refreshChannelList(store);
  }
  return Promise.resolve();
}
