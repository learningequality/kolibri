import logger from 'kolibri.lib.logging';
import { Resource } from '../api-resource';

const logging = logger.getLogger(__filename);

export default class ContentNodeResource extends Resource {
  static resourceName() {
    return 'contentnode';
  }
  static idKey() {
    return 'pk';
  }
  static usesContentCacheKey() {
    return true;
  }
  getDescendantsCollection(id, getParams = {}) {
    if (!id) {
      throw TypeError('An id must be specified');
    }
    this.descendantsCache = this.descendantsCache || {};
    // Add the id to the getParams for cache identification
    getParams.modelId = id;
    let collection;
    const key = this.cacheKey(getParams);
    if (!this.descendantsCache[key]) {
      collection = this.createCollection({}, getParams, []);
      collection.url = (...args) => this.urls[`${this.name}-descendants`](...args, id);
      this.descendantsCache[key] = collection;
    } else {
      collection = this.descendantsCache[key];
    }
    return collection;
  }
  fetchDescendantsAssessments(id) {
    if (!id) {
      throw TypeError('An id must be specified');
    }
    let promise;
    this.descendantsAssessments = this.descendantsAssessments || {};
    const key = this.cacheKey({ id });
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
  }
  fetchNodeAssessments(ids) {
    if (!Array.isArray(ids)) {
      throw TypeError('Ids must be an Array');
    }
    let promise;
    this.nodeAssessments = this.nodeAssessments || {};
    const key = this.cacheKey({ ids });
    if (!this.nodeAssessments[key]) {
      const url = this.urls[`${this.name}-node-assessments`]();
      promise = this.client({ path: url, params: { ids } }).then(response => {
        this.nodeAssessments[key] = response.entity;
        return Promise.resolve(response.entity);
      });
    } else {
      promise = Promise.resolve(this.nodeAssessments[key]);
    }
    return promise;
  }
  fetchAncestors(id) {
    if (!id) {
      throw TypeError('An id must be specified');
    }
    let promise;
    this.ancestor_cache = this.ancestor_cache || {};
    const key = this.cacheKey({ id });
    if (!this.ancestor_cache[key]) {
      const url = this.urls[`${this.name}-ancestors`](id);
      const params = {
        contentCacheKey: this.contentCacheKey,
      };
      promise = this.client({ path: url, cacheBust: false, params }).then(response => {
        if (Array.isArray(response.entity)) {
          this.ancestor_cache[key] = response.entity;
          return Promise.resolve(response.entity);
        }
        logging.debug('Data appears to be malformed', response.entity);
        return Promise.reject(response);
      });
    } else {
      promise = Promise.resolve(this.ancestor_cache[key]);
    }
    return promise;
  }

  getCopies(content_id) {
    if (!content_id) {
      throw TypeError('A content_id must be specified');
    }
    let promise;
    this.copies_cache = this.copies_cache || {};
    const key = this.cacheKey({ content_id });
    if (!this.copies_cache[key]) {
      const url = this.urls[`${this.name}-copies`](content_id);

      promise = this.client({ path: url }).then(response => {
        if (Array.isArray(response.entity)) {
          this.copies_cache[key] = response.entity;
          return Promise.resolve(response.entity);
        }
        logging.debug('Data appears to be malformed', response.entity);
        return Promise.reject(response);
      });
    } else {
      promise = Promise.resolve(this.copies_cache[key]);
    }
    return promise;
  }

  getCopiesCount(getParams = {}) {
    const collection = this.createCollection({}, getParams, []);
    collection.url = (...args) => this.urls[`${this.name}-copies-count`](...args);
    return collection;
  }

  fetchNextContent(id) {
    if (!id) {
      throw TypeError('An id must be specified');
    }
    let promise;
    this.next_cache = this.next_cache || {};
    const key = this.cacheKey({ id });
    if (!this.next_cache[key]) {
      const url = this.urls[`${this.name}_next_content`](id);
      const params = {
        contentCacheKey: this.contentCacheKey,
      };
      promise = this.client({ path: url, cacheBust: false, params }).then(response => {
        if (Object(response.entity) === response.entity) {
          this.next_cache[key] = response.entity;
          return Promise.resolve(response.entity);
        }
        logging.debug('Data appears to be malformed', response.entity);
        return Promise.reject(response);
      });
    } else {
      promise = Promise.resolve(this.next_cache[key]);
    }
    return promise;
  }
  /*
   * Method to return a collection that queries the all_content list endpoint.
   * @param resourceIds {Object} the resource ids required for this resource.
   * @param getParams {Object} any getParams for query - most likely the a cursor
   * key to query a different page of the all content endpoint by cursor reference.
   * @return {Collection} returns a collection that will fetch from the all content endpoint.
   */
  getAllContentCollection(getParams = {}) {
    let collection;
    // Create a unique cache key so that this collection can be retrieved again with caching.
    const key = this.cacheKey(getParams, { allContent: true });
    if (!this.collections[key]) {
      collection = this.createCollection({}, getParams, []);
      // Edit the url of the collection so that it fetches from the all_content endpoint,
      // rather than the regular endpoint.
      collection.url = (...args) => this.urls[`${this.name}_all_content`](...args);
    } else {
      collection = this.collections[key];
    }
    return collection;
  }
}
