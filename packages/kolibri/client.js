/*
 * Module for REST API client
 */

import { CancelToken } from 'axios';
import qs from 'qs';
import heartbeat from 'kolibri/heartbeat';
import logger from 'kolibri-logging';
import { get } from '@vueuse/core';
import useUser from 'kolibri/composables/useUser';
import { DisconnectionErrorCodes } from 'kolibri/constants';
import clientFactory from 'kolibri/utils/baseClient';
import useConnection from './internal/useConnection';

export const logging = logger.getLogger(__filename);

const connection = useConnection();

const baseClient = clientFactory();

// Disconnection handler interceptor
baseClient.interceptors.request.use(function (config) {
  if (!get(connection.connected)) {
    // If the vuex state records that we are not currently connected then cancel all
    // outgoing requests.
    const source = CancelToken.source();
    config.cancelToken = source.token;
    source.cancel('Request cancelled as currently disconnected from Kolibri');
  }
  return config;
});

// Login timeout detection interceptor and disconnection monitoring
baseClient.interceptors.response.use(
  response => response,
  function (error) {
    // If we receive a 403 response from the server, it is possible that the user
    // is attempting to access information they are not allowed to see.
    // However, more likely, it is because their login has timed out, but the frontend
    // client code is still trying to access data that they would be allowed to see
    // if they were logged in.
    if (error.response) {
      if (error.response.status === 403) {
        const { id, user_id } = useUser();
        if (get(id) && !get(user_id)) {
          // We have session information but no user_id, which means we are not logged in
          // This is a sign that the user has been logged out due to inactivity
          heartbeat.signOutDueToInactivity();
        } else {
          // In this case, we should check right now if they are still logged in
          heartbeat.pollSessionEndPoint().then(() => {
            // If they are not, we should handle sign out
            if (!get(user_id)) {
              heartbeat.signOutDueToInactivity();
            }
          });
        }
      }
      // On every error, check to see if the status code is one of our designated
      // disconnection status codes.
      if (DisconnectionErrorCodes.includes(error.response.status)) {
        // If so, set our heartbeat module to start monitoring the disconnection state
        heartbeat.monitorDisconnect(error.response.status);
      }
    }
    return Promise.reject(error);
  },
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
      'passing the URL as the only argument is deprecated, please use url option instead',
    );
  }

  const headers = { ...(options.headers || {}), 'X-Requested-With': 'XMLHttpRequest' };
  if (options.multipart) {
    headers['Content-Type'] = 'multipart/form-data';
    options.transformRequest = function (data) {
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
            'entity is deprecated for accessing response data, please use the data key instead',
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
