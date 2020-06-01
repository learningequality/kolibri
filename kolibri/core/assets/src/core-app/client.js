/*
 * Module for REST API client
 */

import qs from 'qs';
import heartbeat from 'kolibri.heartbeat';
import store from 'kolibri.coreVue.vuex.store';
import errorCodes from '../disconnectionErrorCodes';
import clientFactory from './baseClient';

const baseClient = clientFactory();

// Disconnection handler interceptor
baseClient.interceptors.request.use(function(request) {
  if (!store.getters.connected) {
    // If the vuex state records that we are not currently connected then cancel all
    // outgoing requests.
    request.abort();
    return Promise.reject(request);
  }
  return request;
});

// Login timeout detection interceptor and disconnection monitoring
baseClient.interceptors.response.use(
  response => response,
  function(error) {
    // If we receive a 403 response from the server, it is possible that the user
    // is attempting to access information they are not allowed to see.
    // However, more likely, it is because their login has timed out, but the frontend
    // client code is still trying to access data that they would be allowed to see
    // if they were logged in.
    if (error.response) {
      if (error.response.status === 403) {
        if (!store.state.core.session.id) {
          // Don't have any session information, so assume that this
          // page has just been reopened and the session has expired.
          // Redirect now!
          heartbeat.signOutDueToInactivity();
        } else {
          // In this case, we should check right now if they are still logged in
          heartbeat.pollSessionEndPoint();
        }
      }
      // On every error, check to see if the status code is one of our designated
      // disconnection status codes.
    } else if (errorCodes.includes(error.response.status)) {
      // If so, set our heartbeat module to start monitoring the disconnection state
      heartbeat.monitorDisconnect(error.response.status);
    }
    return Promise.reject(error);
  }
);

const client = options => {
  if (
    options &&
    typeof options === 'object' &&
    !Array.isArray(options) &&
    (!options.method || options.method === 'GET')
  ) {
    if (!options.params) {
      options.params = {};
    } else {
      options.params = Object.assign({}, options.params);
    }
    // Cache bust by default, but allow it to be turned off
    if (options.cacheBust || typeof options.cacheBust === 'undefined') {
      const cacheBust = new Date().getTime();
      options.params[cacheBust] = cacheBust;
    }
    if (options.path) {
      // Provide backwards compatibility with the previous Rest JS API.
      options.url = options.path;
      delete options.path;
    }
  }
  const headers = { ...(options.headers || {}) };
  if (options.multipart) {
    headers['Content-Type'] = 'multipart/form-data';
  }
  return baseClient.request({
    ...options,
    headers,
  });
};

export default client;

export const httpClient = options => {
  return client({
    ...options,
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    data: qs.stringify(options.data),
    url: options.url,
  });
};
