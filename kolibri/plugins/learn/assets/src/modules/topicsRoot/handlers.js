import { ContentNodeProgressResource, ContentNodeResource } from 'kolibri.resources';
import chunk from 'lodash/chunk';
import find from 'lodash/find';
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
      ContentNodeResource.fetchCollection({
        getParams: {
          ids: channelRootIds,
          include_coach_content:
            store.getters.isAdmin || store.getters.isCoach || store.getters.isSuperuser,
        },
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

        // We will create an array that will either be empty when there is no user logged in,
        // or it will contain Promises returned by `fetchCollection`.
        // In either case we will pass the `progressPromises` array to Promise.all() and chain
        // a finally() to handle updating the store in any case
        const userIsLoggedIn = store.getters.isUserLoggedIn;
        const progressPromises = !userIsLoggedIn
          ? [] // The user is not logged in - so we don't need to fetch anything
          : chunk(rootNodes, 30).map(chunkOfNodes => {
              // Chunking these to avoid too complex a query.
              const ids = chunkOfNodes.map(n => n.id);
              return ContentNodeProgressResource.fetchCollection({
                getParams: { ids },
              }).then(progressResponse => {
                progressResponse.forEach(o => {
                  // Set the value of progress in the matching node in rootNodes with the
                  // response object's progress_fraction value
                  find(rootNodes, n => n.id == o.id).progress = o.progress_fraction;
                });
              });
            });

        // Whether we've updated the rootNodes with progress or not, we need to update the store
        const updateStore = () => {
          store.commit('topicsRoot/SET_STATE', { rootNodes });
          store.commit('CORE_SET_PAGE_LOADING', false);
          store.commit('CORE_SET_ERROR', null);
        };
        Promise.all(progressPromises)
          .then(updateStore)
          .catch(updateStore);
      });
    },
    error => {
      store.dispatch('handleApiError', error);
      return error;
    }
  );
}
