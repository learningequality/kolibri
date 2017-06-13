const Resource = require('../api-resource').Resource;

class FacilityUsernameResource extends Resource {
  static resourceName() {
    return 'facilityusername';
  }
  static idKey() {
    return 'username';
  }
}

module.exports = FacilityUsernameResource;
