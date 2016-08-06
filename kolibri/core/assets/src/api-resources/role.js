const Resource = require('../api-resource').Resource;

class RoleResource extends Resource {
  static resourceName() {
    return 'role';
  }
}

module.exports = RoleResource;
