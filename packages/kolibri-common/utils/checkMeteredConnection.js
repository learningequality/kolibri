import client from 'kolibri/client';
import urls from 'kolibri/urls';

/**
 * Ask the server whether the current connection is metered.
 * @returns {Promise<boolean>} Resolves with the server-reported metered-connection state.
 */
export default function checkIsMetered() {
  const urlFunction = urls['kolibri:core:check_metered_connection'];
  return client({ url: urlFunction() }).then(response => response.data);
}
