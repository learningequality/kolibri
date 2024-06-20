import { Resource } from 'kolibri.lib.apiResource';
import urls from 'kolibri.urls';

export default new Resource({
  name: 'errorreports',
  report(error) {
    const url = urls['kolibri:core:report']();
    const data = error.getErrorReport();
    return this.client({
      url,
      method: 'post',
      data: data,
    });
  },
});
