const Resource = require('../api-resource').Resource;

class AttemptLogResource extends Resource {
  static resourceName() {
    return 'attemptlog';
  }
  static idKey() {
    return 'id';
  }
}

module.exports = AttemptLogResource;
