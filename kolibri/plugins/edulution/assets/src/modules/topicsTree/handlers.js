import { ContentNodeSlimResource, ContentNodeResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import router from 'kolibri.coreVue.router';
import { PageNames } from '../../constants';
import {
  _collectionState,
  normalizeContentNode,
} from '../../../../../learn/assets/src/modules/coreLearn/utils';
import { KnowledgeMapResource } from '../../apiResources';

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
