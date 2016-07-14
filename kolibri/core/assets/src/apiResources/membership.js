const Resource = require('../api_resource').Resource;

class MembershipResource extends Resource {
  static resourceName() {
    return 'membership';
  }
}

module.exports = MembershipResource;
