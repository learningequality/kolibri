/*
 * Internal module that is used by the default client, http client, and
 * the session fetching apparatus. Made as a separate module to avoid
 * circular dependencies and repeated code.
 */
import rest from 'rest';
import interceptor from 'rest/interceptor';
import errorCode from 'rest/interceptor/errorCode';
import cookiejs from 'js-cookie';

/*
 * Vendored and modified from https://github.com/cujojs/rest/blob/master/interceptor/csrf.js
 */

/**
 * Applies a Cross-Site Request Forgery protection header to a request
 *
 * CSRF protection helps a server verify that a request came from a
 * trusted  client and not another client that was able to masquerade
 * as an authorized client. Sites that use cookie based authentication
 * are particularly vulnerable to request forgeries without extra
 * protection.
 *
 * @see http://en.wikipedia.org/wiki/Cross-site_request_forgery
 *
 * @param {Client} [client] client to wrap
 *
 * @returns {Client}
 */
const csrf = interceptor({
  request: function handleRequest(request) {
    // For more information on how the CSRF token is used on the backend
    // please refer to the Django documentation on the subject:
    // https://docs.djangoproject.com/en/1.11/ref/csrf/
    var headers, name, token;

    headers = request.headers || (request.headers = {});
    name = request.csrfTokenName || 'X-CSRFToken';
    token = request.csrfToken || cookiejs.get('kolibri_csrftoken');

    if (token) {
      headers[name] = token;
    }

    return request;
  },
});

export default rest.wrap(errorCode).wrap(csrf);
