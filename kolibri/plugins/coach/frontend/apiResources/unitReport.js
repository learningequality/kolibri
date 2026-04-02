import { Resource } from 'kolibri/apiResource';
import urls from 'kolibri/urls';

export default new Resource({
  name: 'unitreport',
  namespace: 'kolibri.plugins.coach',
  fetchReport({ courseSessionId, unitContentnodeId }) {
    const url = urls['kolibri:kolibri.plugins.coach:unitreport'](
      courseSessionId,
      unitContentnodeId,
    );
    return this.client({ url, method: 'GET' }).then(response => response.data);
  },
});
