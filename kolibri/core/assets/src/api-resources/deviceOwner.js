const Resource = require('../api-resource').Resource;

class DeviceOwnerResource extends Resource {
  static resourceName() {
    return 'deviceowner';
  }
}

module.exports = DeviceOwnerResource;
