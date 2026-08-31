import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'remotechannel',
  async getKolibriStudioStatus() {
    const { data } = await this.request({ action: 'kolibri_studio_status' });
    return data;
  },
});
