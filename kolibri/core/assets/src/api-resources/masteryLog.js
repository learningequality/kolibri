const Resource = require('../api-resource').Resource;

class MasteryLogResource extends Resource {
  static resourceName() {
    return 'masterylog';
  }
  static idKey() {
    return 'pk';
  }
}

module.exports = MasteryLogResource;
