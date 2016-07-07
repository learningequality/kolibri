const Resource = require('../api_resource').Resource;

class LearnerGroupResource extends Resource {
  static resourceName() {
    return 'learnergroup';
  }
}

module.exports = LearnerGroupResource;
