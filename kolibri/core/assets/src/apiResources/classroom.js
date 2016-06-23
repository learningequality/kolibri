const Resource = require('../api_resource').Resource;

class ClassroomResource extends Resource {
  static resourceName() {
    return 'classroom';
  }
}

module.exports = ClassroomResource;
