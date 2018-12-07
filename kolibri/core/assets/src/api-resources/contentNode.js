import { Resource } from 'kolibri.lib.apiResource';

export default new Resource({
  name: 'contentnode',
  useContentCacheKey: true,
  fetchDescendants(ids, getParams = {}) {
    return this.getListEndpoint('descendants', { ids, ...getParams });
  },
  fetchDescendantsAssessments(ids) {
    return this.getListEndpoint('descendants_assessments', { ids });
  },
  fetchCopies(content_id) {
    return this.fetchDetailCollection('copies', content_id);
  },
  fetchCopiesCount(getParams = {}) {
    return this.fetchListCollection('copies_count', getParams);
  },
  fetchNextContent(id) {
    return this.fetchDetailModel('next_content', id);
  },
  fetchNodeAssessments(ids) {
    return this.getListEndpoint('node_assessments', { ids });
  },
});
