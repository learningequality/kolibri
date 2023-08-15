import { get } from '@vueuse/core';
import { ContentNodeResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import router from 'kolibri.coreVue.router';
import { PageNames } from '../../constants';
import useChannels from '../../composables/useChannels';
import { setCurrentDevice } from '../../composables/useDevices';
import useContentNodeProgress from '../../composables/useContentNodeProgress';
import useDownloadRequests from '../../composables/useDownloadRequests';

const { channelsMap, fetchChannels } = useChannels();
const { fetchContentNodeTreeProgress } = useContentNodeProgress();

function _loadTopicsContent(store, id, baseurl) {
  const shouldResolve = samePageCheckGenerator(store);
  return ContentNodeResource.fetchModel({ id, getParams: { baseurl } }).then(
    content => {
      if (shouldResolve()) {
        const currentChannel = get(channelsMap)[content.channel_id];
        if (!currentChannel) {
          router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
          return;
        }
        store.commit('topicsTree/SET_STATE', {
          content,
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
    return setCurrentDevice(deviceId).then(device => {
      const baseurl = device.base_url;
      const { fetchUserDownloadRequests } = useDownloadRequests(store);
      fetchUserDownloadRequests({ page: 1, pageSize: 20 });
      return fetchChannels({ baseurl }).then(() => {
        return _loadTopicsContent(store, id, baseurl);
      });
    });
  }
  return _loadTopicsContent(store, id);
}

function _handleRootTopic(topic, currentChannel) {
  const isRoot = !topic.parent;
  if (isRoot) {
    topic.description = currentChannel.description;
    topic.tagline = currentChannel.tagline;
    topic.thumbnail = currentChannel.thumbnail;
  }
  return isRoot;
}

function _getChildren(id, topic, skip) {
  let children = topic.children.results || [];
  let skipped = false;
  // If there is only one child, and that child is a topic, then display that instead
  while (skip && children.length === 1 && !children[0].is_leaf) {
    topic = children[0];
    children = topic.children.results || [];
    skipped = true;
    id = topic.id;
  }
  return {
    children,
    skipped,
    id,
  };
}

function _handleTopicRedirect(store, route, children, id, skipped) {
  if (!children.some(c => !c.is_leaf) && route.name !== PageNames.TOPICS_TOPIC_SEARCH) {
    // if there are no children which are not leaf nodes (i.e. they have children themselves)
    // then redirect to search results
    router.replace({
      name: PageNames.TOPICS_TOPIC_SEARCH,
      params: { ...route.params, id },
      query: route.query,
    });
    store.commit('SET_PAGE_NAME', PageNames.TOPICS_TOPIC_SEARCH);
  } else if (skipped) {
    // If we have skipped down the topic tree, replace to the new top level topic
    router.replace({ name: route.name, params: { ...route.params, id }, query: route.query });
  }
}

function _loadTopicsTopic(store, { route, baseurl } = {}) {
  let id = route.params.id;
  const skip = route.query && route.query.skip === 'true';
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

        const isRoot = _handleRootTopic(topic, currentChannel);

        const childrenResults = _getChildren(id, topic, skip);

        const { children, skipped } = childrenResults;

        id = childrenResults.id;

        _handleTopicRedirect(store, route, children, id, skipped);

        store.commit('topicsTree/SET_STATE', {
          isRoot,
          channel: currentChannel,
          topic,
          contents: children,
        });

        store.dispatch('notLoading');
        store.commit('CORE_SET_ERROR', null);
      }
    },
    error => {
      if (shouldResolve()) {
        if (error.response && error.response.status === 410) {
          router.replace({ name: PageNames.LIBRARY });
          return;
        }
        store.dispatch('handleError', error);
      }
    }
  );
}

export function showTopicsTopic(store, route) {
  return store.dispatch('loading').then(() => {
    store.commit('SET_PAGE_NAME', route.name);
    const shouldResolve = samePageCheckGenerator(store);
    if (route.params.deviceId) {
      return setCurrentDevice(route.params.deviceId).then(device => {
        const baseurl = device.base_url;
        const { fetchUserDownloadRequests } = useDownloadRequests(store);
        fetchUserDownloadRequests({ page: 1, pageSize: 100 });
        return fetchChannels({ baseurl })
          .then(() => {
            return _loadTopicsTopic(store, { route, baseurl });
          })
          .catch(error => {
            if (shouldResolve()) {
              if (error.response && error.response.status === 410) {
                router.replace({ name: PageNames.LIBRARY });
                return;
              }
              store.dispatch('handleError', error);
            }
          });
      });
    }
    return _loadTopicsTopic(store, { route });
  });
}
