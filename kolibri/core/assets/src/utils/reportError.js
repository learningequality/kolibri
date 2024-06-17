import urls from 'kolibri.urls';
import { httpClient } from 'kolibri.client';

function report(error) {
  const url = urls['kolibri:core:report']();
  const data = {
    error_message: error.message,
    traceback: error.stack,
  };
  httpClient({
    method: 'POST',
    url,
    data,
  })
    .then(response => {
      console.log('Error reported successfully:', response.data); // eslint-disable-line no-console
    })
    .catch(err => {
      console.error('Failed to report error:', err); // eslint-disable-line no-console
    });
}
export default report;
