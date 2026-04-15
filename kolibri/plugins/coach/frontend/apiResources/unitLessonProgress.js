import { Resource } from 'kolibri/apiResource';
import urls from 'kolibri/urls';

export default new Resource({
  name: 'unitlessonprogress',
  namespace: 'kolibri.plugins.coach',
  fetchProgress({ courseSessionId, unitContentnodeId }) {
    const url = urls['kolibri:kolibri.plugins.coach:unit_lesson_progress'](
      courseSessionId,
      unitContentnodeId,
    );
    return this.client({ url, method: 'GET' }).then(response => response.data);
  },
});
