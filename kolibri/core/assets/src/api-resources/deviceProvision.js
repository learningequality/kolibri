import { Resource } from '../api-resource';

export default class DeviceProvisionResource extends Resource {
  static resourceName() {
    return 'deviceprovision';
  }
  get collectionUrl() {
    return this.urls[this.name];
  }
}
