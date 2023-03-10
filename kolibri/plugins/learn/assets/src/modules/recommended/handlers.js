import { get } from '@vueuse/core';
import { ContentNodeResource, RemoteChannelResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { PageNames, KolibriStudioId } from '../../constants';
import useChannels from '../../composables/useChannels';
import { setCurrentDevice } from '../../composables/useDevices';
import useLearnerResources from '../../composables/useLearnerResources';
import { searchKeys } from '../../composables/useSearch';
import plugin_data from 'plugin_data';

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
      }
    },
    error => {
      shouldResolve() ? store.dispatch('handleError', error) : null;
    }
  );
}

function _showLibrary(store, query, channels, baseurl) {
  if (!channels.length) {
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
    return Promise.resolve();
  }
  return _showChannels(store, query, channels, baseurl);
}

export function showLibrary(store, query, deviceId = null) {
  /**
   * ToDo: remove if block.
   * Currently the channels & contentnode browser apis in studio
   * are not able to load content using the the studio base url.
   * Once studio is updated, this function will need to be refactored
   * to use the else block code only.
   *
   * The if block is only meant for UI viualization purposes only
   * during development
   */
  if (deviceId === KolibriStudioId) {
    RemoteChannelResource.getKolibriStudioStatus().then(({ data }) => {
      if (data.status === 'online') {
        RemoteChannelResource.fetchCollection().then(channels => {
          //This is a hack to return kolibri channels.
          store.commit('SET_ROOT_NODES', channels);

          store.commit('CORE_SET_PAGE_LOADING', false);
          store.commit('CORE_SET_ERROR', null);
          store.commit('SET_PAGE_NAME', PageNames.LIBRARY);
          return Promise.resolve();
        });
      }
    });
  } else {
    if (deviceId) {
      return setCurrentDevice(deviceId).then(device => {
        const baseurl = deviceId === KolibriStudioId ? plugin_data.studio_baseurl : device.base_url;
        return fetchChannels({ baseurl }).then(channels => {
          return _showLibrary(store, query, channels, baseurl);
        });
      });
    }
    return _showLibrary(store, query, get(channels));
  }
}
