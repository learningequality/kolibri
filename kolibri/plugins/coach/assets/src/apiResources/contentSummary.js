const Resource = require('kolibri.lib.apiResource').Resource;

class ContentSummaryResource extends Resource {
  static resourceName() {
    return 'kolibri:coach:contentsummary';
  }
  static idKey() {
    return 'pk';
  }
  static resourceIdentifiers() {
    return [
      'channel_id',
      'collection_kind',
      'collection_id',
    ];
  }
}

module.exports = ContentSummaryResource;
