const Resource = require('../api_resource').Resource;

class ContentNodeResource extends Resource {
  constructor(...args) {
    super(...args);
    this._models = {};
    this._collections = {};
  }
  setChannel(channelId) {
    // Track models for different channels separately.
    if (!this._models[channelId]) {
      this._models[channelId] = {};
    }
    if (!this._collections[channelId]) {
      this._collections[channelId] = {};
    }
    this.models = this._models[channelId];
    this.collections = this._collections[channelId];
    this.channelId = channelId;
  }
  get modelUrl() {
    // Return a function that calls the modelUrl method of the base class, but prefix the arguments
    // with the channelId that is currently set.
    // N.B. Here and below the super calls are to getters that return functions that are
    // immediately invoked.
    return (...args) => this.urls[`${this.name}_detail`](this.channelId, ...args);
  }
  get collectionUrl() {
    // Return a function that calls the collectionUrl method of the base class, but prefix the
    // arguments with the channelId that is currently set.
    return (...args) => this.urls[`${this.name}_list`](this.channelId, ...args);
  }
  static resourceName() {
    return 'contentnode';
  }
  static idKey() {
    return 'pk';
  }
}

module.exports = ContentNodeResource;
