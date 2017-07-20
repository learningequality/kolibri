const Resource = require('kolibri.lib.apiResource').Resource;

class UserSummaryResource extends Resource {
  static resourceName() {
    return 'kolibri:coach:contentreport';
  }
  static idKey() {
    return 'pk';
  }
  static resourceIdentifiers() {
    return [
      'channel_id',
      'content_node_id',
    ];
  }
}

module.exports = UserSummaryResource;
