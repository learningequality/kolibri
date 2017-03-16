const Resource = require('../api-resource').Resource;

class UserExamResource extends Resource {
  static resourceName() {
    return 'userexam';
  }
  static idKey() {
    return 'id';
  }
}

module.exports = UserExamResource;
