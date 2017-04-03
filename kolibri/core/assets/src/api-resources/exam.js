const Resource = require('../api-resource').Resource;

class ExamResource extends Resource {
  static resourceName() {
    return 'exam';
  }
  static idKey() {
    return 'id';
  }
}

module.exports = ExamResource;
