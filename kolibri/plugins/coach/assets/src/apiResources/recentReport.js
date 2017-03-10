const Resource = require('kolibri.lib.apiResource').Resource;

class RecentReportResource extends Resource {
  static resourceName() {
    return 'kolibri:coach:recentreport';
  }
  static idKey() {
    return 'pk';
  }
  static resourceIdentifiers() {
    return [
      'channel_id',
      'content_node_id',
      'collection_kind',
      'collection_id',
    ];
  }
}

module.exports = RecentReportResource;
