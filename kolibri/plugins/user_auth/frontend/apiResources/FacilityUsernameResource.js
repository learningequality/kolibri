import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'facilityusername',
  namespace: 'kolibri.plugins.user_auth',
  idKey: 'username',

  async osuser() {
    const response = await this.request({ action: 'osuser' });
    return response.data;
  },
});
