import { ContentNodeResource } from 'kolibri.resources';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { _collectionState } from '../coreLearn/utils';

export function clearSearch(store, searchTerm = '') {
  store.commit('RESET_STATE');
  store.commit('SET_SEARCH_TERM', searchTerm);
}

export function triggerSearch(store, searchTerm) {
  if (!searchTerm) {
    return store.dispatch('clearSearch');
  }

  return ContentNodeResource.getPagedCollection({ search: searchTerm })
    .fetch()
    .then(results => {
      const contents = _collectionState(results);
      store.commit('SET_STATE', {
        contents,
        searchTerm,
      });
      store.commit('CORE_SET_PAGE_LOADING', false, { root: true });

      const contentIds = contents
        .filter(
          content =>
            content.kind !== ContentNodeKinds.TOPIC && content.kind !== ContentNodeKinds.CHANNEL
        )
        .map(content => content.content_id);
      if (contentIds.length) {
        ContentNodeResource.getCopiesCount({
          content_ids: contentIds,
        })
          .fetch()
          .then(copiesCount => {
            const updatedContents = contents.map(content => {
              const updatedContent = content;
              const matchingContent = copiesCount.find(
                copyCount => copyCount.content_id === content.content_id
              );
              if (matchingContent) {
                updatedContent.copies_count = matchingContent.count;
              }
              return updatedContent;
            });
            store.commit('SET_CONTENT', updatedContents);
          })
          .catch(error => store.dispatch('handleApiError', error), { root: true });
      }
    })
    .catch(error => {
      store.dispatch('handleApiError', error, { root: true });
    });
}
