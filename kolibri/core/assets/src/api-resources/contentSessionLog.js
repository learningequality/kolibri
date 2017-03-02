const Resource = require('../api-resource').Resource;

class ContentSessionLogResource extends Resource {
  static resourceName() {
    return 'contentsessionlog';
  }
  static idKey() {
    return 'pk';
  }
}

module.exports = ContentSessionLogResource;
