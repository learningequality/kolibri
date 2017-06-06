const Resource = require('../api-resource').Resource;

class ContentNodeProgressResource extends Resource {
  static resourceName() {
    return 'contentnodeprogress';
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

module.exports = ContentNodeProgressResource;
