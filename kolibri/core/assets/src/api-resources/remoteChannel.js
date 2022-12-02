import { Resource } from 'kolibri.lib.apiResource';

export default new Resource({
  name: 'remotechannel',
  cacheBust: false,
  getKolibriStudioStatus() {
    return this.getListEndpoint('kolibri_studio_status');
  },
});
