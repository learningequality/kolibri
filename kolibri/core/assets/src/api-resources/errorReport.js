import { Resource } from 'kolibri.lib.apiResource';
import urls from 'kolibri.urls';

export default new Resource({
  name: 'errorreports',
  report(error) {
    const url = urls['kolibri:core:report']();
    const data = {
      error_message: error.message,
      traceback: error.stack,
    };
    return this.client({
      url,
      method: 'post',
      data: data,
    });
  },
});
