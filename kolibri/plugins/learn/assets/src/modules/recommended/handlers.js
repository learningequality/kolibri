import { get } from '@vueuse/core';
import { ContentNodeResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { PageNames } from '../../constants';
import useChannels from '../../composables/useChannels';
import { setCurrentDevice } from '../../composables/useDevices';
import useLearnerResources from '../../composables/useLearnerResources';
import { searchKeys } from '../../composables/useSearch';

const { channels, fetchChannels } = useChannels();

const { fetchResumableContentNodes } = useLearnerResources();

function _showChannels(store, query, channels, baseurl) {
  if (store.getters.isUserLoggedIn && !baseurl) {
    fetchResumableContentNodes();
  }
  const shouldResolve = samePageCheckGenerator(store);
  return ContentNodeResource.fetchCollection({
    getParams: {
      parent__isnull: true,
      include_coach_content:
        store.getters.isAdmin || store.getters.isCoach || store.getters.isSuperuser,
      baseurl,
    },
  }).then(
    channelCollection => {
      if (shouldResolve()) {
        // we want them to be in the same order as the channels list
        const rootNodes = channels
          .map(channel => {
            const node = channelCollection.find(n => n.channel_id === channel.id);
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

        store.commit('CORE_SET_PAGE_LOADING', false);
        store.commit('CORE_SET_ERROR', null);
        store.commit('SET_PAGE_NAME', PageNames.LIBRARY);
        store.commit('SET_ROOT_NODES_LOADING', false);
      }
    },
    error => {
      shouldResolve() ? store.dispatch('handleError', error) : null;
      store.commit('SET_ROOT_NODES_LOADING', false);
    }
  );
}

function _showLibrary(store, query, channels, baseurl) {
  // Don't set the 'page loading' boolean, to prevent flash and loss of keyboard focus.
  if (store.state.pageName !== PageNames.LIBRARY) {
    store.commit('CORE_SET_PAGE_LOADING', true);
  }
  if (!channels.length && !store.getters.isUserLoggedIn) {
    return;
  }
  // Special case for when only the page number changes:
  // Don't set the 'page loading' boolean, to prevent flash and loss of keyboard focus.
  if (store.state.pageName !== PageNames.LIBRARY) {
    store.commit('CORE_SET_PAGE_LOADING', true);
  }

  if (searchKeys.some(key => query[key])) {
    // If currently on a route with search terms
    // just finish early and let the component handle loading
    store.commit('CORE_SET_PAGE_LOADING', false);
    store.commit('CORE_SET_ERROR', null);
    store.commit('SET_PAGE_NAME', PageNames.LIBRARY);
    store.commit('SET_ROOT_NODES_LOADING', false);
    return Promise.resolve();
  }
  return _showChannels(store, query, channels, baseurl);
}

export function showLibrary(store, query, deviceId = null) {
  if (deviceId) {
    store.commit('SET_ROOT_NODES_LOADING', true);
    return setCurrentDevice(deviceId).then(device => {
      const baseurl = device.base_url;
      return fetchChannels({ baseurl }).then(channels => {
        // _showLibrary should unset the rootNodesLoading
        return _showLibrary(store, query, channels, baseurl);
      });
    });
  }
  return _showLibrary(store, query, get(channels));
}
