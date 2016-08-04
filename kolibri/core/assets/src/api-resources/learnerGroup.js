const Resource = require('../api-resource').Resource;

class LearnerGroupResource extends Resource {
  static resourceName() {
    return 'learnergroup';
  }
}

module.exports = LearnerGroupResource;
