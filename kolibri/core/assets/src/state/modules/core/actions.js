import debounce from 'lodash/debounce';
import pick from 'lodash/pick';
import client from 'kolibri/client';
import heartbeat from 'kolibri/heartbeat';
import logger from 'kolibri-logging';
import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
import UserSyncStatusResource from 'kolibri-common/apiResources/UserSyncStatusResource';
import { setServerTime } from 'kolibri/utils/serverClock';
import urls from 'kolibri/urls';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import CatchErrors from 'kolibri/utils/CatchErrors';
import Vue from 'vue';
import Lockr from 'lockr';
import {
  DisconnectionErrorCodes,
  LoginErrors,
  ERROR_CONSTANTS,
  UPDATE_MODAL_DISMISSED,
} from 'kolibri/constants';
import { browser, os } from 'kolibri/utils/browserInfo';
import { baseSessionState } from '../session';

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



/**
 * Sets a password that is currently not specified
 * due to an account that was created while passwords
 * were not required.
 *
 * @param {object} store The store.
 * @param {object} sessionPayload The session payload.
 */
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

/**
 * Signs in user.
 *
 * @param {object} store The store.
 * @param {object} sessionPayload The session payload.
 */




const _setPageVisibility = debounce((store, visibility) => {
  store.commit('CORE_SET_PAGE_VISIBILITY', visibility);
}, 500);

export function setPageVisibility(store) {
  _setPageVisibility(store, document.visibilityState === 'visible');
}

export function getFacilities(store) {
  return FacilityResource.fetchCollection({ force: true }).then(facilities => {
    store.commit('CORE_SET_FACILITIES', [...facilities]);
  });
}

export function getFacilityConfig(store, facilityId) {
  const { userFacilityId, selectedFacility } = store.getters;
  const facId = facilityId || userFacilityId;
  if (!facId) {
    // No facility Id, so nothing good is going to happen here.
    // Redirect and let Kolibri sort it out.
    return Promise.resolve(redirectBrowser());
  }
  let datasetPromise;
  if (selectedFacility && typeof selectedFacility.dataset !== 'object') {
    datasetPromise = Promise.resolve([selectedFacility.dataset]);
  } else {
    datasetPromise = FacilityDatasetResource.fetchCollection({
      getParams: {
        // fetchCollection for currentSession's facilityId if none was passed
        facility_id: facId,
      },
    });
  }

  return datasetPromise.then(facilityConfig => {
    let config = {};
    const facility = facilityConfig[0];
    if (facility) {
      config = { ...facility };
    }
    store.commit('CORE_SET_FACILITY_CONFIG', config);
  });
}

export function loading(store) {
  return new Promise(resolve => {
    store.commit('CORE_SET_PAGE_LOADING', true);
    Vue.nextTick(() => {
      resolve();
    });
  });
}

export function notLoading(store) {
  return new Promise(resolve => {
    store.commit('CORE_SET_PAGE_LOADING', false);
    Vue.nextTick(() => {
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
