const Resource = require('../api_resource').Resource;

class FacilityUserResource extends Resource {
  static resourceName() {
    return 'facilityuser';
  }
}

module.exports = FacilityUserResource;
