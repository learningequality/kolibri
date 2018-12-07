/*
 * Internal module that is used by the default client, http client, and
 * the session fetching apparatus. Made as a separate module to avoid
 * circular dependencies and repeated code.
 */
import rest from 'rest';
import csrf from 'rest/interceptor/csrf';
import errorCode from 'rest/interceptor/errorCode';
import cookiejs from 'js-cookie';

export default rest.wrap(errorCode).wrap(csrf, {
  name: 'X-CSRFToken',
  token: cookiejs.get('csrftoken'),
});
