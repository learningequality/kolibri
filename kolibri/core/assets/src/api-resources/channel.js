const Resource = require('../api-resource').Resource;

class ChannelResource extends Resource {
  static resourceName() {
    return 'channel';
  }
}

module.exports = ChannelResource;
