const Resource = require('../api-resource').Resource;

class ExamLogResource extends Resource {
  static resourceName() {
    return 'examlog';
  }
  static idKey() {
    return 'id';
  }
}

module.exports = ExamLogResource;
