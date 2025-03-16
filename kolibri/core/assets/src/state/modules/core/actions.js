import debounce from 'lodash/debounce';
import pick from 'lodash/pick';
import client from 'kolibri/client';
import heartbeat from 'kolibri/heartbeat';
import logger from 'kolibri-logging';
import UserSyncStatusResource from 'kolibri-common/apiResources/UserSyncStatusResource';
import { setServerTime } from 'kolibri/utils/serverClock';
import urls from 'kolibri/urls';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import CatchErrors from 'kolibri/utils/CatchErrors';
import { nextTick } from 'vue';
import Lockr from 'lockr';
import { DisconnectionErrorCodes } from 'kolibri/constants';

const logging = logger.getLogger(__filename);

/**
 * Vuex State Mappers
 *
 * The methods below help map data from
 * the API to state in the Vuex store
 */

/**
 * Actions
 *
 * These methods are used to update client-side state
 */

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
    errorString = JSON.stringify(error, null, 2);
  } else if (error.response) {
    if (DisconnectionErrorCodes.includes(error.response.status)) {
      // Do not log errors for disconnections, as it disrupts the user experience
      // and should already be being handled by our disconnection overlay.
      heartbeat.setReloadOnReconnect(reloadOnReconnect);
      return;
    }
    // Reassign object properties here as Axios error objects have built in
    // pretty printing support which messes with this.
    errorString = JSON.stringify(error.response, null, 2);
  } else if (error instanceof Error) {
    errorString = error.toString();
  }
  handleError(store, errorString);
  throw error;
}

// Session management has been migrated to useUser composable

// Authentication actions have been migrated to useUser composable

const _setPageVisibility = debounce((store, visibility) => {
  store.commit('CORE_SET_PAGE_VISIBILITY', visibility);
}, 500);

export function setPageVisibility(store) {
  _setPageVisibility(store, document.visibilityState === 'visible');
}

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
  // for fetching all users that are members of a particular classroom id
  if (params.member_of) {
    return UserSyncStatusResource.fetchCollection({
      force: true,
      getParams: { member_of: params.member_of },
    }).then(
      syncData => {
        return syncData;
      },
      error => {
        store.dispatch('handleApiError', { error });
        return error;
      },
    );
  }
  // for fetching an individual user
  else if (params.user) {
    return UserSyncStatusResource.fetchCollection({
      force: true,
      getParams: { user: params.user },
    }).then(
      syncData => {
        return syncData;
      },
      error => {
        store.dispatch('handleApiError', { error });
        return error;
      },
    );
  }
}
