/*
 * Module for REST API client
 */

import interceptor from 'rest/interceptor';
import mime from 'rest/interceptor/mime';
import baseClient from './baseClient';
import errorCodes from '../disconnectionErrorCodes';

import heartbeat from 'kolibri.heartbeat';
import { connected } from 'kolibri.coreVue.vuex.getters';
import store from 'kolibri.coreVue.vuex.store';

const disconnectInterceptor = interceptor({
  request: function(request) {
    if (!connected(store.state)) {
      if (request.cancel) {
        request.cancel();
      }
      request.canceled = true;
    }
    return request;
  },
  response: function(response) {
    if (response.request && response.request.canceled) {
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
      // In this case, we should check right now if they are still logged in
      heartbeat.beat();
    }
    return response;
  },
});

const serverDisconnectDetection = interceptor({
  response: function(response) {
    if (response.status && errorCodes.includes(response.status.code)) {
      heartbeat.monitorDisconnect();
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
    }
    const cacheBust = new Date().getTime();
    options.params[cacheBust] = cacheBust;
  }
  return baseClient
    .wrap(disconnectInterceptor)
    .wrap(mime, { mime: 'application/json' })
    .wrap(loginTimeoutDetection)
    .wrap(serverDisconnectDetection)(options).then(response => {
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
