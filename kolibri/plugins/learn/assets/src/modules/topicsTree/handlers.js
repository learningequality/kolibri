import { get } from '@vueuse/core';
import { ContentNodeResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import router from 'kolibri.coreVue.router';
import { PageNames } from '../../constants';
import useChannels from '../../composables/useChannels';
import { fetchDevice } from '../../composables/useDevices';
import useContentNodeProgress from '../../composables/useContentNodeProgress';
import { _collectionState, contentState } from '../coreLearn/utils';

const { channelsMap, fetchChannels } = useChannels();
const { fetchContentNodeTreeProgress } = useContentNodeProgress();

function _loadTopicsContent(store, id, baseurl) {
  const shouldResolve = samePageCheckGenerator(store);
  ContentNodeResource.fetchModel({ id, getParams: { baseurl } }).then(
    content => {
      if (shouldResolve()) {
        const currentChannel = get(channelsMap)[content.channel_id];
        if (!currentChannel) {
          router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
          return;
        }
        store.commit('topicsTree/SET_STATE', {
          content: contentState(content),
          channel: currentChannel,
        });
        store.commit('CORE_SET_PAGE_LOADING', false);
        store.commit('CORE_SET_ERROR', null);
      }
    },
    error => {
      shouldResolve() ? store.dispatch('handleError', error) : null;
    }
  );
}

export function showTopicsContent(store, id, deviceId = null) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', PageNames.TOPICS_CONTENT);
  if (deviceId) {
    return fetchDevice(deviceId).then(device => {
      const baseurl = device.base_url;
      return fetchChannels({ baseurl }).then(() => {
        return _loadTopicsContent(store, id, baseurl);
      });
    });
  }
  return _loadTopicsContent(store, id);
}

function _loadTopicsTopic(store, { id, pageName, query, baseurl }) {
  const skip = query && query.skip === 'true';
  const params = {
    include_coach_content:
      store.getters.isAdmin || store.getters.isCoach || store.getters.isSuperuser,
    baseurl,
  };
  if (store.getters.isUserLoggedIn && !baseurl) {
    fetchContentNodeTreeProgress({ id, params });
  }
  const shouldResolve = samePageCheckGenerator(store);
  return ContentNodeResource.fetchTree({
    id,
    params,
  }).then(
    topic => {
      if (shouldResolve()) {
        const currentChannel = get(channelsMap)[topic.channel_id];
        if (!currentChannel) {
          router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
          return;
        }
        const isRoot = !topic.parent;
        if (isRoot) {
          topic.description = currentChannel.description;
          topic.tagline = currentChannel.tagline;
          topic.thumbnail = currentChannel.thumbnail;
        }
        let children = topic.children.results || [];
        let skipped = false;
        // If there is only one child, and that child is a topic, then display that instead
        while (skip && children.length === 1 && !children[0].is_leaf) {
          topic = children[0];
          children = topic.children.results || [];
          skipped = true;
          id = topic.id;
        }

        // if there are no children which are not leaf nodes (i.e. they have children themselves)
        // then redirect to search results
        if (!children.some(c => !c.is_leaf) && pageName !== PageNames.TOPICS_TOPIC_SEARCH) {
          router.replace({ name: PageNames.TOPICS_TOPIC_SEARCH, params: { id }, query });
          store.commit('SET_PAGE_NAME', PageNames.TOPICS_TOPIC_SEARCH);
        } else if (skipped) {
          router.replace({ name: pageName, params: { id }, query });
        }

        store.commit('topicsTree/SET_STATE', {
          isRoot,
          channel: currentChannel,
          topic,
          contents: _collectionState(children),
        });

        store.dispatch('notLoading');
        store.commit('CORE_SET_ERROR', null);
      }
    },
    error => {
      shouldResolve() ? store.dispatch('handleError', error) : null;
    }
  );
}

export function showTopicsTopic(store, { id, pageName, query, deviceId = null } = {}) {
  return store.dispatch('loading').then(() => {
    store.commit('SET_PAGE_NAME', pageName);
    if (deviceId) {
      return fetchDevice(deviceId).then(device => {
        const baseurl = device.base_url;
        return fetchChannels({ baseurl }).then(() => {
          return _loadTopicsTopic(store, { id, pageName, query, baseurl });
        });
      });
    }
    return _loadTopicsTopic(store, { id, pageName, query });
  });
}
