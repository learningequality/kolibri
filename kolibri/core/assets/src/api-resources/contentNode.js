import { Resource } from '../api-resource';
import logger from 'kolibri.lib.logging';

const logging = logger.getLogger(__filename);

export default class ContentNodeResource extends Resource {
  static resourceName() {
    return 'contentnode';
  }
  static idKey() {
    return 'pk';
  }
  getDescendantsCollection(id, getParams = {}) {
    if (!id) {
      throw TypeError('An id must be specified');
    }
    // Add the id to the getParams for cache identification
    getParams.modelId = id;
    let collection;
    const key = this.cacheKey(getParams);
    if (!this.collections[key]) {
      collection = this.createCollection({}, getParams, []);
      collection.url = (...args) => this.urls[`${this.name}-descendants`](...args, id);
    } else {
      collection = this.collections[key];
    }
    return collection;
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
      promise = this.client({ path: url }).then(response => {
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
  fetchNextContent(id) {
    if (!id) {
      throw TypeError('An id must be specified');
    }
    let promise;
    this.next_cache = this.next_cache || {};
    const key = this.cacheKey({ id });
    if (!this.next_cache[key]) {
      const url = this.urls[`${this.name}_next_content`](id);
      promise = this.client({ path: url }).then(response => {
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
