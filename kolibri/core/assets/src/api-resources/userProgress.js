const Resource = require('../api-resource').Resource;

class UserProgressResource extends Resource {
  static resourceName() {
    return 'userprogress';
  }
  static idKey() {
    return 'id';
  }
}

module.exports = UserProgressResource;
