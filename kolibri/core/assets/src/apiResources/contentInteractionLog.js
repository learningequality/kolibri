const Resource = require('../api_resource').Resource;

class ContentInteractionLogResource extends Resource {
  static resourceName() {
    return 'contentinteractionlog';
  }
}

module.exports = ContentInteractionLogResource;
