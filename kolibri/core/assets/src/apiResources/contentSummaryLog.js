const Resource = require('../api_resource').Resource;

class ContentSummaryLogResource extends Resource {
  static resourceName() {
    return 'contentsummarylog';
  }
}

module.exports = ContentSummaryLogResource;
