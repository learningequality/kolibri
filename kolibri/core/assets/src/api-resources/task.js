const Resource = require('../api-resource').Resource;

class TaskResource extends Resource {
  static resourceName() {
    return 'task';
  }
}

module.exports = TaskResource;
