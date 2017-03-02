const Resource = require('../api-resource').Resource;

class ContentSummaryLogResource extends Resource {
  static resourceName() {
    return 'contentsummarylog';
  }
  static idKey() {
    return 'pk';
  }
}

module.exports = ContentSummaryLogResource;
