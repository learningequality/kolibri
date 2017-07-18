/*
 * Module for REST API client
 */

import rest from 'rest';
import mime from 'rest/interceptor/mime';
import csrf from 'rest/interceptor/csrf';
import errorCode from 'rest/interceptor/errorCode';
import cookiejs from 'js-cookie';

const client = options => {
  if (
    options &&
    typeof options === 'object' &&
    !Array.isArray(options) &&
    (!options.method || options.method === 'GET')
  ) {
    if (!options.params) {
      options.params = {};
    }
    const cacheBust = new Date().getTime();
    options.params[cacheBust] = cacheBust;
  }
  return rest
    .wrap(mime, { mime: 'application/json' })
    .wrap(csrf, {
      name: 'X-CSRFToken',
      token: cookiejs.get('csrftoken'),
    })
    .wrap(errorCode)(options);
};

export default client;

export const httpClient = rest
  .wrap(mime, {
    mime: 'application/x-www-form-urlencoded',
  })
  .wrap(csrf, {
    name: 'X-CSRFToken',
    token: cookiejs.get('csrftoken'),
  });
