import urls from 'kolibri/urls';
import client from 'kolibri/client';

/**
 * Sets a password that is currently not specified
 * due to an account that was created while passwords
 * were not required.
 */
export function setUnspecifiedPassword({ username, password, facility }) {
  return client({
    url: urls['kolibri:core:setnonspecifiedpassword'](),
    data: {
      username,
      password,
      facility,
    },
    method: 'post',
  });
}
