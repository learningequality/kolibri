import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'attendancesession',
  fetchRecentSessions(getParams) {
    return this.fetchListCollection('recent', getParams);
  },
  async fetchRecentSessions_v2(params) {
    const response = await this.request({ action: 'recent', params });
    return response.data;
  },
});
