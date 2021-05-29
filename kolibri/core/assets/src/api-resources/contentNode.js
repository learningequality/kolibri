import isPlainObject from 'lodash/isPlainObject';
import { Resource } from 'kolibri.lib.apiResource';
import Store from 'kolibri.coreVue.vuex.store';
import urls from 'kolibri.urls';
import cloneDeep from '../cloneDeep';

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
  fetchRecommendationsFor(id, getParams) {
    return this.fetchDetailCollection('recommendations_for', id, getParams);
  },
  fetchResume(getParams) {
    return this.fetchDetailCollection('resume', Store.getters.currentUserId, getParams);
  },
  fetchPopular(getParams) {
    return this.fetchListCollection('popular', getParams);
  },
  fetchNextSteps(getParams) {
    return this.fetchDetailCollection('next_steps', Store.getters.currentUserId, getParams);
  },
  cache: {},
  fetchModel({ id }) {
    if (this.cache[id]) {
      return Promise.resolve(this.cache[id]);
    }
    return this.client({ url: this.modelUrl(id) }).then(response => {
      this.cacheData(response.data);
      return response.data;
    });
  },
  cacheData(data) {
    if (Array.isArray(data)) {
      for (let model of data) {
        this.cacheData(model);
      }
    } else if (isPlainObject(data)) {
      if (data[this.idKey]) {
        this.cache[data[this.idKey]] = Object.assign(
          this.cache[data[this.idKey]] || {},
          cloneDeep(data)
        );
        if (data.children) {
          this.cacheData(data.children);
        }
      } else if (data.results) {
        for (let model of data.results) {
          this.cacheData(model);
        }
      }
    }
  },
  fetchCollection(params) {
    return this.client({ url: this.collectionUrl(), params }).then(response => {
      this.cacheData(response.data);
      return response.data;
    });
  },
  fetchTree(id, params) {
    const url = urls['kolibri:core:contentnode_tree_detail'](id);
    return this.client({ url, params }).then(response => {
      this.cacheData(response.data);
      return response.data;
    });
  },
  fetchMoreTree({ id, params }) {
    return this.fetchTree(id, params);
  },
});
