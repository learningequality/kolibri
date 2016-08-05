const Resource = require('../api_resource').Resource;

class DeviceOwnerResource extends Resource {
  static resourceName() {
    return 'deviceowner';
  }
}

module.exports = DeviceOwnerResource;
