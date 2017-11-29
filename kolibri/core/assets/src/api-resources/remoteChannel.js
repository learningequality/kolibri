import { Resource } from '../api-resource';

export default class RemoteChannelResource extends Resource {
  static resourceName() {
    return 'remotechannel';
  }

  getKolibriStudioStatus() {
    return this.client({
      path: this.urls[`${this.name}-kolibri-studio-status`](),
      method: 'GET',
    });
  }
}
