/*
 * Module for REST API client
 */

import interceptor from 'rest/interceptor';
import mime from 'rest/interceptor/mime';
import heartbeat from 'kolibri.heartbeat';
import store from 'kolibri.coreVue.vuex.store';
import errorCodes from '../disconnectionErrorCodes';
import baseClient from './baseClient';

const disconnectInterceptor = interceptor({
  request: function(request) {
    if (!store.getters.connected) {
      // If the vuex state records that we are not currently connected then cancel all
      // outgoing requests.
      if (request.cancel) {
        // If the request has a cancel method, call it.
        request.cancel();
      }
      // Set the request as canceled
      request.canceled = true;
    }
    return request;
  },
  response: function(response) {
    if (response.request && response.request.canceled) {
      // If a request has been canceled, reject the response and throw an error
      return Promise.reject(response);
    }
    return response;
  },
});

const loginTimeoutDetection = interceptor({
  error: function(response) {
    // If we receive a 403 response from the server, it is possible that the user
    // is attempting to access information they are not allowed to see.
    // However, more likely, it is because their login has timed out, but the frontend
    // client code is still trying to access data that they would be allowed to see
    // if they were logged in.
    if (response.status && response.status.code === 403) {
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
    return Promise.reject(response);
  },
});

const serverDisconnectDetection = interceptor({
  response: function(response) {
    // On every response, check to see if the status code is one of our designated
    // disconnection status codes.
    if (response.status && errorCodes.includes(response.status.code)) {
      // If so, set our heartbeat module to start monitoring the disconnection state
      heartbeat.monitorDisconnect(response.status.code);
      // Return an error
      return Promise.reject(response);
    }
    return response;
  },
});

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
  }
  return baseClient
    .wrap(disconnectInterceptor)
    .wrap(mime, { mime: 'application/json' })
    .wrap(loginTimeoutDetection)
    .wrap(serverDisconnectDetection)(options)
    .then(response => {
      if (response.request && response.request.canceled) {
        return Promise.reject(response);
      }
      return response;
    });
};

export default client;

export const httpClient = baseClient
  .wrap(disconnectInterceptor)
  .wrap(mime, {
    mime: 'application/x-www-form-urlencoded',
  })
  .wrap(loginTimeoutDetection)
  .wrap(serverDisconnectDetection);
