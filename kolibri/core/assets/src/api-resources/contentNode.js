import { Resource } from '../api-resource';

export default new Resource({
  name: 'contentnode',
  useContentCacheKey: true,
  fetchDescendantsCollection(id, getParams = {}) {
    return this.fetchDetailCollection('descendants', id, getParams);
  },
  fetchDescendantsAssessments(id) {
    if (!id) {
      throw TypeError('An id must be specified');
    }
    let promise;
    this.descendantsAssessments = this.descendantsAssessments || {};
    const key = this.__cacheKey({ id });
    if (!this.descendantsAssessments[key]) {
      const url = this.urls[`${this.name}-descendants-assessments`](id);
      promise = this.client({ path: url }).then(response => {
        this.descendantsAssessments[key] = response.entity;
        return Promise.resolve(response.entity);
      });
    } else {
      promise = Promise.resolve(this.descendantsAssessments[key]);
    }
    return promise;
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
