const Resource = require('../api-resource').Resource;

class ContentNodeResource extends Resource {
  static resourceName() {
    return 'contentnode';
  }
  static idKey() {
    return 'pk';
  }
  static resourceIdentifiers() {
    return [
      'channel_id',
    ];
  }
  getDescendantsCollection(id, resourceIds = {}, getParams = {}) {
    if (!id) {
      throw TypeError('An id must be specified');
    }
    if (!this.hasResourceIds) {
      if (Object.keys(resourceIds).length && Object.keys(getParams).length) {
        throw TypeError(
          `resourceIds and getParams passed to getCollection method of ${this.name} ` +
          'resource, which does not use resourceIds, only pass getParams for this resource');
      } else if (Object.keys(resourceIds).length) {
        getParams = resourceIds; // eslint-disable-line no-param-reassign
      }
    }
    // Add the id to the getParams for cache identification
    getParams.modelId = id;
    const filteredResourceIds = this.filterAndCheckResourceIds(resourceIds);
    let collection;
    const key = this.cacheKey(getParams, filteredResourceIds);
    if (!this.collections[key]) {
      collection = this.createCollection(filteredResourceIds, getParams, []);
      collection.url = (...args) => this.urls[`${this.name}-descendants`](...args, id);
    } else {
      collection = this.collections[key];
    }
    return collection;
  }
}

module.exports = ContentNodeResource;
