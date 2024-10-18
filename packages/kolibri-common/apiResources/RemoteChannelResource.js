import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'remotechannel',
  getKolibriStudioStatus() {
    return this.getListEndpoint('kolibri_studio_status');
  },
});
