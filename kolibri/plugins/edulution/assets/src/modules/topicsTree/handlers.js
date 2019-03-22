import {
  ContentNodeSlimResource,
  ContentNodeResource,
  ContentNodeProgressResource,
} from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import router from 'kolibri.coreVue.router';
import { PageNames } from '../../constants';
import { _collectionState, normalizeContentNode, contentState } from '../coreLearn/utils';
import { KnowledgeMapResource } from '../../apiResources';

export function showTopicsChannel(store, id) {
  return store.dispatch('loading').then(() => {
    store.commit('SET_PAGE_NAME', PageNames.TOPICS_CHANNEL);
    return showTopicsTopic(store, { id, isRoot: true });
  });
}

export function showTopicsContent(store, id) {
  store.commit('SET_EMPTY_LOGGING_STATE');
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', PageNames.TOPICS_CONTENT);

  const promises = [
    ContentNodeResource.fetchModel({ id }),
    ContentNodeResource.fetchNextContent(id),
    ContentNodeSlimResource.fetchAncestors(id),
    store.dispatch('setChannelInfo'),
  ];
  ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    ([content, nextContent, ancestors]) => {
      const currentChannel = store.getters.getChannelObject(content.channel_id);
      if (!currentChannel) {
        router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      store.commit('topicsTree/SET_STATE', {
        content: contentState(content, nextContent, ancestors),
        channel: currentChannel,
      });
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
    },
    error => {
      store.dispatch('handleApiError', error);
    }
  );
}

export function showTopicsTopic(store, { id, isRoot = false }) {
  return store.dispatch('loading').then(() => {
    store.commit('SET_PAGE_NAME', isRoot ? PageNames.TOPICS_CHANNEL : PageNames.TOPICS_TOPIC);
    const include_fields = [];
    if (store.getters.isCoach || store.getters.isAdmin) {
      include_fields.push('num_coach_contents');
    }
    const promises = [
      ContentNodeResource.fetchModel({ id }), // the topic
      ContentNodeSlimResource.fetchCollection({
        getParams: {
          parent: id,
          by_role: true,
          include_fields,
        },
      }), // the topic's children
      ContentNodeSlimResource.fetchAncestors(id), // the topic's ancestors
      store.dispatch('setChannelInfo'),
    ];

    return ConditionalPromise.all(promises).only(
      samePageCheckGenerator(store),
      ([topic, children, ancestors]) => {
        const currentChannel = store.getters.getChannelObject(topic.channel_id);
        if (!currentChannel) {
          router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
          return;
        }
        if (isRoot) {
          topic.description = currentChannel.description;
        }
        store.commit('topicsTree/SET_STATE', {
          isRoot,
          channel: currentChannel,
          topic: normalizeContentNode(topic, ancestors),
          contents: _collectionState(children),
        });

        // Only load contentnode progress if the user is logged in
        if (store.getters.isUserLoggedIn) {
          const contentNodeIds = children.map(({ id }) => id);

          if (contentNodeIds.length > 0) {
            ContentNodeProgressResource.fetchCollection({
              getParams: { ids: contentNodeIds },
            }).then(progresses => {
              store.commit('topicsTree/SET_NODE_PROGRESS', progresses);
            });
          }
        }

        store.dispatch('notLoading');
        store.commit('CORE_SET_ERROR', null);
      },
      error => {
        store.dispatch('handleApiError', error);
      }
    );
  });
}

export function showKnowledgeMap(store, id) {
  return store.dispatch('loading').then(() => {
    store.commit('SET_PAGE_NAME', PageNames.KNOWLEDGE_MAP);
    const promises = [
      ContentNodeResource.fetchModel({ id }), // the topic
      KnowledgeMapResource.fetchKnowdledgeMap(id), // the topic's children
      ContentNodeSlimResource.fetchAncestors(id), // the topic's ancestors
      store.dispatch('setChannelInfo'),
    ];
    return ConditionalPromise.all(promises).only(
      samePageCheckGenerator(store),
      ([topic, { progress, results }, ancestors]) => {
        const currentChannel = store.getters.getChannelObject(topic.channel_id);
        if (!currentChannel) {
          router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
          return;
        }
        topic.description = currentChannel.description;
        store.commit('topicsTree/SET_STATE', {
          isRoot: true,
          channel: currentChannel,
          topic: normalizeContentNode(topic, ancestors),
          contents: _collectionState(results),
          progress: progress,
        });
        store.dispatch('notLoading');
        store.commit('CORE_SET_ERROR', null);
      },
      error => {
        store.dispatch('handleApiError', error);
      }
    );
  });
}
