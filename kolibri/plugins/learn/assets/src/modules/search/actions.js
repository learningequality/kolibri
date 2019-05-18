import { ContentNodeResource, ContentNodeSearchResource } from 'kolibri.resources';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { _collectionState } from '../coreLearn/utils';

export function clearSearch(store, searchTerm = '') {
  store.commit('RESET_STATE');
  store.commit('SET_SEARCH_TERM', searchTerm);
}

function setCopiesCount(store, contents) {
  const contentIds = contents
    .filter(
      content =>
        content.kind !== ContentNodeKinds.TOPIC && content.kind !== ContentNodeKinds.CHANNEL
    )
    .map(content => content.content_id);
  if (contentIds.length) {
    ContentNodeResource.fetchCopiesCount({
      content_ids: contentIds,
    })
      .then(copiesCount => {
        store.commit('SET_CONTENT_COPIES', copiesCount);
      })
      .catch(error => store.dispatch('handleApiError', error, { root: true }));
  }
}

export function triggerSearch(
  store,
  { searchTerm = '', kindFilter = null, channelFilter = null } = {}
) {
  if (!searchTerm) {
    return store.dispatch('clearSearch');
  }

  const getParams = {
    search: searchTerm,
    kind: kindFilter,
    channel_id: channelFilter,
  };

  return ContentNodeSearchResource.getCollection(getParams)
    .fetch()
    .then(({ results, channel_ids, content_kinds, total_results }) => {
      const contents = _collectionState(results);
      store.commit('SET_STATE', {
        contents,
        searchTerm,
        channel_ids,
        content_kinds,
        kindFilter,
        channelFilter,
        total_results,
      });
      store.commit('CORE_SET_PAGE_LOADING', false, { root: true });
      setCopiesCount(store, contents);
    })
    .catch(error => {
      store.dispatch('handleApiError', error, { root: true });
    });
}

export function loadMore(store) {
  const search = store.state.searchTerm;
  const kind = store.state.kindFilter;
  const channel_id = store.state.channelFilter;
  const exclude_content_ids = store.state.contents.map(content => content.content_id);
  const getParams = {
    search,
    kind,
    channel_id,
    exclude_content_ids,
  };
  return ContentNodeSearchResource.getCollection(getParams)
    .fetch()
    .then(({ results }) => {
      const contents = _collectionState(results);
      store.commit('SET_ADDITIONAL_CONTENTS', contents);
      store.commit('CORE_SET_PAGE_LOADING', false, { root: true });
      setCopiesCount(store, contents);
    })
    .catch(error => {
      store.dispatch('handleApiError', error, { root: true });
    });
}
