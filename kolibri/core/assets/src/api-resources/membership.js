const Resource = require('../api-resource').Resource;

/**
 * @example <caption>Get all memberships for a given user</caption>
 * MembershipResource.getCollection({ user_id: userId })
 */
class MembershipResource extends Resource {
  static resourceName() {
    return 'membership';
  }
}

module.exports = MembershipResource;
