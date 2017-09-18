import { Resource } from '../api-resource';

export default class DevicePermissionsResource extends Resource {
  static resourceName() {
    return 'devicepermissions';
  }
  static idKey() {
    return 'user';
  }
}

// special class that executes POST when using createModel().save()
export class NewDevicePermissionsResource extends Resource {
  static resourceName() {
    return 'devicepermissions';
  }
  static idKey() {
    return 'id';
  }
}
