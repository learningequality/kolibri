import client from 'kolibri/client';
import urls from 'kolibri/urls';

export default function checkIsMetered() {
  const urlFunction = urls['kolibri:core:check_metered_connection'];
  return client({ url: urlFunction() }).then(response => response.data);
}
