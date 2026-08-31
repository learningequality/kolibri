import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'attendancesession',
  async fetchRecentSessions(params) {
    const response = await this.request({ action: 'recent', params });
    return response.data;
  },
});
