import logger from 'kolibri.lib.logging';
import { Resource } from '../api-resource';

const logging = logger.getLogger(__filename);

/**
 * TODO
 */
export default class ContentNodeSlimResource extends Resource {
  static resourceName() {
    return 'contentnode_slim';
  }

  static idKey() {
    return 'pk';
  }

  static usesContentCacheKey() {
    return true;
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
}
