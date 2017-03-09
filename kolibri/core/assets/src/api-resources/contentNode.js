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
}

module.exports = ContentNodeResource;
