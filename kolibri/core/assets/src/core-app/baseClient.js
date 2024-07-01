/*
 * Internal module that is used by the default client, http client, and
 * the session fetching apparatus. Made as a separate module to avoid
 * circular dependencies and repeated code.
 */
import axios from 'axios';
import qs from 'qs';

export default function clientFactory(options) {
  const client = axios.create({
    xsrfCookieName: 'kolibri_csrftoken',
    xsrfHeaderName: 'X-CSRFToken',
    paramsSerializer: {
      serialize: function (params) {
        // Do custom querystring stingifying to comma separate array params
        return qs.stringify(params, { arrayFormat: 'comma' });
      },
    },
    ...options,
  });
  client.interceptors.response.use(
    response => response,
    function (error) {
      if (!error) {
        error = {};
      }
      if (!error.response) {
        error.response = {
          status: 0,
        };
      }
      return Promise.reject(error);
    },
  );
  return client;
}
