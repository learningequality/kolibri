import { Resource } from '../api-resource';

export default class DeviceProvisionResource extends Resource {
  static resourceName() {
    return 'deviceprovision';
  }
  static idKey() {
    return 'user';
  }
  get collectionUrl() {
    return this.urls[this.name];
  }
}
