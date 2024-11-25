import client from 'kolibri/client';
import urls from 'kolibri/urls';

/**
 * @returns Promise<Boolean>
 * Returns a function that returns a Promise that resolves to something responding to
 * `data.value` whether it succeeds or fails.
 */
export default function checkIsMetered() {
  const urlFunction = urls['kolibri:core:check_metered_connection'];
  return client({ url: urlFunction() }).then(response => response.data);
}
