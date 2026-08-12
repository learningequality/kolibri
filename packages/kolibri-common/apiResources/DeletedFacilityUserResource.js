import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'deletedfacilityuser',
  async restoreCollection(params = {}) {
    if (!Object.keys(params).length) {
      throw TypeError('Params must be specified to narrow what is being restored');
    }
    const response = await this.request({ method: 'POST', action: 'restore', params });
    return response.data;
  },
});
