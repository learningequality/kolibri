const Resource = require('../api-resource').Resource;

class ContentSummaryResource extends Resource {
  static resourceName() {
    return 'contentsummary';
  }
}

module.exports = ContentSummaryResource;
