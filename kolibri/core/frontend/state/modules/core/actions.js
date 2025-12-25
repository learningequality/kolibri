import urls from 'kolibri/urls';
import client from 'kolibri/client';
import heartbeat from 'kolibri/heartbeat';
import logger from 'kolibri-logging';
import UserSyncStatusResource from 'kolibri-common/apiResources/UserSyncStatusResource';
import { nextTick } from 'vue';
import { DisconnectionErrorCodes } from 'kolibri/constants';
import sanitizeError from 'kolibri/utils/sanitizeError';

const logging = logger.getLogger(__filename);

export function handleError(store, errorString) {
  logging.debug(errorString);
  store.commit('CORE_SET_ERROR', errorString);
  store.commit('CORE_SET_PAGE_LOADING', false);
}

export function clearError(store) {
  store.commit('CORE_SET_ERROR', null);
}

export function handleApiError(store, { error, reloadOnReconnect = false } = {}) {
  let errorString = error;
  if (typeof error === 'object' && !(error instanceof Error)) {
    errorString = JSON.stringify(sanitizeError(error), null, 2);
  } else if (error.response) {
    if (DisconnectionErrorCodes.includes(error.response.status)) {
      heartbeat.setReloadOnReconnect(reloadOnReconnect);
      return;
    }
    errorString = JSON.stringify(sanitizeError(error).response, null, 2);
  } else if (error instanceof Error) {
    errorString = error.toString();
  }
  handleError(store, errorString);
  throw error;
}

export function kolibriSetUnspecifiedPassword(store, { username, password, facility }) {
  const data = {
    username,
    password,
    facility,
  };
  return client({
    url: urls['kolibri:core:setnonspecifiedpassword'](),
    data,
    method: 'post',
  });
}

// Session management has been migrated to useUser composable
// Authentication actions have been migrated to useUser composable

// Removed old setPageVisibility logic

export function loading(store) {
  return new Promise(resolve => {
    store.commit('CORE_SET_PAGE_LOADING', true);
    nextTick(() => {
      resolve();
    });
  });
}

export function notLoading(store) {
  return new Promise(resolve => {
    store.commit('CORE_SET_PAGE_LOADING', false);
    nextTick(() => {
      resolve();
    });
  });
}

export function fetchUserSyncStatus(store, params) {
  if (params.member_of) {
    return UserSyncStatusResource.fetchCollection({
      force: true,
      getParams: { member_of: params.member_of },
    }).then(
      syncData => syncData,
      error => {
        store.dispatch('handleApiError', { error });
        return error;
      },
    );
  } else if (params.user) {
    return UserSyncStatusResource.fetchCollection({
      force: true,
      getParams: { user: params.user },
    }).then(
      syncData => syncData,
      error => {
        store.dispatch('handleApiError', { error });
        return error;
      },
    );
  }
}
