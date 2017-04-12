const Resource = require('../api-resource').Resource;

class ExamAssignmentResource extends Resource {
  static resourceName() {
    return 'examassignment';
  }
  static idKey() {
    return 'id';
  }
}

module.exports = ExamAssignmentResource;
