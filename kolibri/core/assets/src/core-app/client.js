/*
 * Module for REST API client
 */

import axios from 'axios';
import qs from 'qs';
import heartbeat from 'kolibri.heartbeat';
import logger from 'kolibri.lib.logging';
import store from 'kolibri.coreVue.vuex.store';
import errorCodes from '../disconnectionErrorCodes';
import clientFactory from './baseClient';

export const logging = logger.getLogger(__filename);

const baseClient = clientFactory();

// Disconnection handler interceptor
baseClient.interceptors.request.use(function(config) {
  if (!store.getters.connected) {
    // If the vuex state records that we are not currently connected then cancel all
    // outgoing requests.
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    config.cancelToken = source.token;
    source.cancel('Request cancelled as currently disconnected from Kolibri');
  }
  return config;
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
      if (errorCodes.includes(error.response.status)) {
        // If so, set our heartbeat module to start monitoring the disconnection state
        heartbeat.monitorDisconnect(error.response.status);
      }
    }
    return Promise.reject(error);
  }
);

const client = options => {
  if (
    options &&
    typeof options === 'object' &&
    !Array.isArray(options) &&
    (!options.method || options.method.toLowerCase() === 'get')
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
      logging.warn('option path is deprecated, please use url option instead');
    }
  }
  if (typeof options === 'string') {
    options = { url: options };
    logging.warn(
      'passing the URL as the only argument is deprecated, please use url option instead'
    );
  }

  const headers = { ...(options.headers || {}), 'X-Requested-With': 'XMLHttpRequest' };
  if (options.multipart) {
    headers['Content-Type'] = 'multipart/form-data';
    options.transformRequest = function(data) {
      const fd = new FormData();
      Object.keys(data).forEach(item => {
        fd.append(item, data[item]);
      });
      return fd;
    };
  }
  return baseClient
    .request({
      ...options,
      headers,
    })
    .then(response => {
      Object.defineProperty(response, 'entity', {
        get() {
          logging.warn(
            'entity is deprecated for accessing response data, please use the data key instead'
          );
          return response.data;
        },
      });
      return response;
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
