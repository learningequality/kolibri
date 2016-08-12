const Resource = require('../api-resource').Resource;

class ContentSessionLogResource extends Resource {
  static resourceName() {
    return 'contentsessionlog';
  }
}

module.exports = ContentSessionLogResource;
