const Resource = require('../api-resource').Resource;

class ClassroomResource extends Resource {
  static resourceName() {
    return 'classroom';
  }
}

module.exports = ClassroomResource;
