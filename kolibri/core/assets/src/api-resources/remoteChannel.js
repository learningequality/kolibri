import { Resource } from '../api-resource';

export default new Resource({
  name: 'remotechannel',
  getKolibriStudioStatus() {
    return this.client({
      path: this.urls[`${this.name}-kolibri-studio-status`](),
      method: 'GET',
    });
  },
});
