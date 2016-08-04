const Resource = require('../api_resource').Resource;

class ChannelMetadataResource extends Resource {
  static resourceName() {
    return 'channel';
  }
}

module.exports = ChannelMetadataResource;
