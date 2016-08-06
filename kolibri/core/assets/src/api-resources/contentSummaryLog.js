const Resource = require('../api-resource').Resource;

class ContentSummaryLogResource extends Resource {
  static resourceName() {
    return 'contentsummarylog';
  }
}

module.exports = ContentSummaryLogResource;
