const Resource = require('../api_resource').Resource;

class ContentNodeResource extends Resource {
  constructor(...args) {
    super(...args);
    this._models = {};
  }
  setChannel(channelId) {
    // Track models for different channels separately.
    if (!this._models[channelId]) {
      this._models[channelId] = {};
    }
    this.models = this._models[channelId];
    this.channelId = channelId;
  }
  get modelUrl() {
    // Return a function that calls the modelUrl method of the base class, but prefix the arguments
    // with the channelId that is currently set.
    // N.B. Here and below the super calls are to getters that return functions that are
    // immediately invoked.
    return (...args) => super.modelUrl(this.channelId, ...args);
  }
  get collectionUrl() {
    // Return a function that calls the collectionUrl method of the base class, but prefix the
    // arguments with the channelId that is currently set.
    return (...args) => super.collectionUrl(this.channelId, ...args);
  }
  static resourceName() {
    return 'contentnode';
  }
  static idKey() {
    return 'pk';
  }
}

module.exports = ContentNodeResource;
