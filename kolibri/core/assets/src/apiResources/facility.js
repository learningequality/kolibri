const Resource = require('../api_resource').Resource;

class FacilityResource extends Resource {
  static resourceName() {
    return 'facility';
  }
}

module.exports = FacilityResource;
