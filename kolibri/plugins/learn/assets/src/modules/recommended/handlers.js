import { get } from '@vueuse/core';
import { ContentNodeResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { PageNames } from '../../constants';
import useChannels from '../../composables/useChannels';
import useLearnerResources from '../../composables/useLearnerResources';
import { searchKeys } from '../../composables/useSearch';
import { _collectionState } from '../coreLearn/utils';

const { channels } = useChannels();

const { fetchResumableContentNodes } = useLearnerResources();

export function showLibrary(store, query) {
  if (!get(channels).length) {
    return;
  }
  // Special case for when only the page number changes:
  // Don't set the 'page loading' boolean, to prevent flash and loss of keyboard focus.
  if (store.state.pageName !== PageNames.LIBRARY) {
    store.commit('CORE_SET_PAGE_LOADING', true);
  }

  const promises = [];

  if (!searchKeys.some(key => query[key])) {
    // If not currently on a route with search terms
    promises.push(
      ContentNodeResource.fetchCollection({
        getParams: {
          parent__isnull: true,
          include_coach_content:
            store.getters.isAdmin || store.getters.isCoach || store.getters.isSuperuser,
        },
      })
    );
    if (store.getters.isUserLoggedIn) {
      promises.push(fetchResumableContentNodes());
    }
  }
  const shouldResolve = samePageCheckGenerator(store);
  return Promise.all(promises).then(
    ([channelCollection]) => {
      if (shouldResolve()) {
        if (channelCollection && channelCollection.length) {
          // we want them to be in the same order as the channels list
          const rootNodes = get(channels)
            .map(channel => {
              const node = _collectionState(channelCollection).find(
                n => n.channel_id === channel.id
              );
              if (node) {
                // The `channel` comes with additional data that is
                // not returned from the ContentNodeResource.
                // Namely thumbnail, description and tagline (so far)
                node.title = channel.name || node.title;
                node.thumbnail = channel.thumbnail;
                node.description = channel.tagline || channel.description;
                return node;
              }
            })
            .filter(Boolean);

          store.commit('SET_ROOT_NODES', rootNodes);
        }

        store.commit('CORE_SET_PAGE_LOADING', false);
        store.commit('CORE_SET_ERROR', null);
        store.commit('SET_PAGE_NAME', PageNames.LIBRARY);
      }
    },
    error => {
      shouldResolve() ? store.dispatch('handleError', error) : null;
    }
  );
}
