const Resource = require('../api-resource').Resource;

class FacilityResource extends Resource {
  static resourceName() {
    return 'facility';
  }
}

module.exports = FacilityResource;
