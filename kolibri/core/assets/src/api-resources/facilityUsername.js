const Resource = require('../api-resource').Resource;

class FacilityUsernameResource extends Resource {
  static resourceName() {
    return 'facilityusername';
  }
}

module.exports = FacilityUsernameResource;
