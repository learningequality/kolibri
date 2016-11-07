const Resource = require('../api-resource').Resource;

class UserReportResource extends Resource {
  static resourceName() {
    return 'userreport';
  }
}

module.exports = UserReportResource;
