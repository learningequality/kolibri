import pickBy from 'lodash/pickBy';
import uniq from 'lodash/uniq';
import { ContentNodeSearchResource } from 'kolibri.resources';

export function fetchAdditionalSearchResults(store, params) {
  return ContentNodeSearchResource.fetchCollection({
    getParams: pickBy({
      search: params.searchTerm,
      kind: params.kind,
      channel_id: params.channelId,
      exclude_content_ids: uniq(params.currentResults.map(({ content_id }) => content_id)),
    }),
  }).then(results => {
    store.commit('SET_ADDITIONAL_SEARCH_RESULTS', results);
  });
}
