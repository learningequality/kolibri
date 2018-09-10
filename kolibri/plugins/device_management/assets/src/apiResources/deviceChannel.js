import { Resource } from 'kolibri.lib.apiResource';

class DeviceChannelResource extends Resource {
  static resourceName() {
    return 'kolibri:devicemanagementplugin:device_channel';
  }
}

const deviceChannelResource = new DeviceChannelResource();

export default deviceChannelResource;
