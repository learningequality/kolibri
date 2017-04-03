const Resource = require('../api-resource').Resource;

class ExamAttemptLogResource extends Resource {
  static resourceName() {
    return 'examattemptlog';
  }
  static idKey() {
    return 'id';
  }
}

module.exports = ExamAttemptLogResource;
