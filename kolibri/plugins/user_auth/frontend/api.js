import urls from 'kolibri/urls';
import client from 'kolibri/client';

/**
 * Set a password for an account that was created while passwords were not
 * required, and so currently has no password specified.
 * @param {object} payload - Request payload.
 * @param {string} payload.username - The username for the account being updated.
 * @param {string} payload.password - The new password to set.
 * @param {string} payload.facility - The id of the facility the account belongs to.
 * @returns {Promise<object>} Resolves with the request response.
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
