import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'remotechannel',
  getKolibriStudioStatus() {
    return this.getListEndpoint('kolibri_studio_status');
  },
  // Unlike `getKolibriStudioStatus`, resolves with `response.data`, not the whole response.
  async getKolibriStudioStatus_v2() {
    const { data } = await this.request({ action: 'kolibri_studio_status' });
    return data;
  },
});
