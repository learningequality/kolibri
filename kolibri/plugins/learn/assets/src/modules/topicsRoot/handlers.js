import { ContentNodeSlimResource } from 'kolibri.resources';
import { PageNames } from '../../constants';
import { _collectionState } from '../coreLearn/utils';

export function showChannels(store) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', PageNames.TOPICS_ROOT);

  return store.dispatch('setAndCheckChannels').then(
    channels => {
      if (!channels.length) {
        return;
      }
      const channelRootIds = channels.map(channel => channel.root);
      const include_fields = [];
      if (store.getters.isCoach || store.getters.isAdmin) {
        include_fields.push('num_coach_contents');
      }
      ContentNodeSlimResource.fetchCollection({
        getParams: { ids: channelRootIds, by_role: true, include_fields },
      }).then(channelCollection => {
        // we want them to be in the same order as the channels list
        const rootNodes = channels
          .map(channel => {
            const node = _collectionState(channelCollection).find(n => n.channel_id === channel.id);
            if (node) {
              node.thumbnail = channel.thumbnail;
              return node;
            }
          })
          .filter(Boolean);
        store.commit('topicsRoot/SET_STATE', { rootNodes });
        store.commit('CORE_SET_PAGE_LOADING', false);
        store.commit('CORE_SET_ERROR', null);
      });
    },
    error => {
      store.dispatch('handleApiError', error);
      return error;
    }
  );
}
