const Resource = require('../api_resource').Resource;

class ChannelResource extends Resource {

  static resourceName() {
    return 'channel';
  }
}

module.exports = ChannelResource;
