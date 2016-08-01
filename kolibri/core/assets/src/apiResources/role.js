const Resource = require('../api_resource').Resource;

class RoleResource extends Resource {
  static resourceName() {
    return 'role';
  }
}

module.exports = RoleResource;
