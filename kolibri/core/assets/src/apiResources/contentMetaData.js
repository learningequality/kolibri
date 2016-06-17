const Resource = require('../api_resource').Resource;

class ContentMetaDataResource extends Resource {
  setChannel(channelId) {
    this.channelId = channelId;
  }
  get modelUrl() {
    return (...args) => super.modelUrl(this.channelId, ...args);
  }
  get collectionUrl() {
    return (...args) => super.collectionUrl(this.channelId, ...args);
  }
}

module.exports = ContentMetaDataResource;
