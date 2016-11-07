const Resource = require('../api-resource').Resource;

class RecentReportResource extends Resource {
  static resourceName() {
    return 'recentreport';
  }
}

module.exports = RecentReportResource;
