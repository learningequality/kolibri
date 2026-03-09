import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'attendancesession',
  fetchRecentSessions(getParams) {
    return this.fetchListCollection('recent', getParams);
  },
});
