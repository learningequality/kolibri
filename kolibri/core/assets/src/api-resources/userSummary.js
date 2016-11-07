const Resource = require('../api-resource').Resource;

class UserSummaryResource extends Resource {
  static resourceName() {
    return 'usersummary';
  }
}

module.exports = UserSummaryResource;
