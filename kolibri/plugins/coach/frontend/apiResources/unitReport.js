import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'unitreports',
  namespace: 'kolibri.plugins.coach',
  fetchReports({ courseSessionId, unitIds }) {
    return this.request({
      routeParams: courseSessionId,
      params: { unit_ids: unitIds },
    }).then(response => response.data);
  },
});
