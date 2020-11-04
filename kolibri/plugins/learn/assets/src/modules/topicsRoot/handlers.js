import { ShortcutContentNodeResource } from 'kolibri.resources';
import { ContentNodeResource } from 'kolibri.resources';
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
      return Promise.all([
        ContentNodeResource.fetchCollection({
          getParams: { ids: channelRootIds, user_kind: store.getters.getUserKind },
        }).then(channelCollection => {
          // we want them to be in the same order as the channels list
          const rootNodes = channels
            .map(channel => {
              const node = _collectionState(channelCollection).find(n => n.channel_id === channel.id);
              if (node) {
                // The `channel` comes with additional data that is
                // not returned from the ContentNodeResource.
                // Namely thumbnail, description and tagline (so far)
                node.thumbnail = channel.thumbnail;
                node.description = channel.description;
                node.tagline = channel.tagline;
                return node;
              }
            })
            .filter(Boolean);
          return { rootNodes };
        }),
        ShortcutContentNodeResource.fetchCollection({
          getParams: {},
        }).then(shortcutNodes => {
          shortcutNodes.sort((a, b) => {
            const a_order = channels.findIndex(channel => channel.id === a.channel_id);
            const b_order = channels.findIndex(channel => channel.id === b.channel_id);

            // Sort by channel order...
            if (a_order < b_order) {
              return -1;
            } else if (a_order > b_order) {
              return 1;
            }

            return 0;
          });
          return { shortcutNodes }; 
        })
      ]).then(values => {
          const state = Object.assign.apply({}, values);
          store.commit('topicsRoot/SET_STATE', state);
          store.commit('CORE_SET_PAGE_LOADING', false);
          store.commit('CORE_SET_ERROR', null);
        }
      );
    },
    error => {
      store.dispatch('handleApiError', error);
      return error;
    }
  );
}
