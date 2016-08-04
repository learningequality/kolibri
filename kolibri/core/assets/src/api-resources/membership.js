const Resource = require('../api-resource').Resource;

class MembershipResource extends Resource {
  static resourceName() {
    return 'membership';
  }
}

module.exports = MembershipResource;
