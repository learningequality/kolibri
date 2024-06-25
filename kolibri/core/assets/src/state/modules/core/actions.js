import debounce from 'lodash/debounce';
import pick from 'lodash/pick';
import client from 'kolibri.client';
import logger from 'kolibri.lib.logging';
import {
  FacilityResource,
  FacilityDatasetResource,
  ChannelResource,
  UserProgressResource,
  UserSyncStatusResource,
  PingbackNotificationResource,
  PingbackNotificationDismissedResource,
} from 'kolibri.resources';
import { setServerTime } from 'kolibri.utils.serverClock';
import urls from 'kolibri.urls';
import redirectBrowser from 'kolibri.utils.redirectBrowser';
import CatchErrors from 'kolibri.utils.CatchErrors';
import Vue from 'kolibri.lib.vue';
import Lockr from 'lockr';
import { baseSessionState } from '../session';
import { LoginErrors, ERROR_CONSTANTS, UPDATE_MODAL_DISMISSED } from '../../../constants';
import { browser, os } from '../../../utils/browserInfo';
import errorCodes from './../../../disconnectionErrorCodes.js';

const logging = logger.getLogger(__filename);

/**
 * Vuex State Mappers
 *
 * The methods below help map data from
 * the API to state in the Vuex store
 */

function _channelListState(data) {
  return data.map(channel => ({
    id: channel.id,
    title: channel.name,
    description: channel.description,
    tagline: channel.tagline,
    root_id: channel.root,
    last_updated: channel.last_updated,
    version: channel.version,
    thumbnail: channel.thumbnail,
    num_coach_contents: channel.num_coach_contents,
  }));
}

function _notificationListState(data) {
  return data.map(notification => ({
    id: notification.id,
    version_range: notification.version_range,
    timestamp: notification.timestamp,
    link_url: notification.link_url,
    i18n: notification.i18n,
  }));
}

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
    if (errorCodes.includes(error.response.status)) {
      // Do not log errors for disconnections, as it disrupts the user experience
      // and should already be being handled by our disconnection overlay.
      store.commit('CORE_SET_RELOAD_ON_RECONNECT', reloadOnReconnect);
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

export function setSession(store, { session, clientNow }) {
  const serverTime = session.server_time;
  if (clientNow) {
    setServerTime(serverTime, clientNow);
  }
  session = pick(session, Object.keys(baseSessionState));
  store.commit('CORE_SET_SESSION', session);
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
export function kolibriLogin(store, sessionPayload) {
  Lockr.set(UPDATE_MODAL_DISMISSED, false);
  return client({
    data: {
      ...sessionPayload,
      active: true,
      browser,
      os,
    },
    url: urls['kolibri:core:session-list'](),
    method: 'post',
  })
    .then(() => {
      // check redirect is disabled:
      if (!sessionPayload.disableRedirect)
        if (sessionPayload.next) {
          // OIDC redirect
          redirectBrowser(sessionPayload.next);
        }
        // Normal redirect on login
        else {
          redirectBrowser();
        }
    })
    .catch(error => {
      const errorsCaught = CatchErrors(error, [
        ERROR_CONSTANTS.INVALID_CREDENTIALS,
        ERROR_CONSTANTS.MISSING_PASSWORD,
        ERROR_CONSTANTS.PASSWORD_NOT_SPECIFIED,
        ERROR_CONSTANTS.NOT_FOUND,
      ]);
      if (errorsCaught) {
        if (errorsCaught.includes(ERROR_CONSTANTS.INVALID_CREDENTIALS)) {
          return LoginErrors.INVALID_CREDENTIALS;
        } else if (errorsCaught.includes(ERROR_CONSTANTS.MISSING_PASSWORD)) {
          return LoginErrors.PASSWORD_MISSING;
        } else if (errorsCaught.includes(ERROR_CONSTANTS.PASSWORD_NOT_SPECIFIED)) {
          return LoginErrors.PASSWORD_NOT_SPECIFIED;
        } else if (errorsCaught.includes(ERROR_CONSTANTS.NOT_FOUND)) {
          return LoginErrors.USER_NOT_FOUND;
        }
      } else {
        store.dispatch('handleApiError', { error });
      }
    });
}

export function kolibriLogout() {
  // Use the logout backend URL to initiate logout
  redirectBrowser(urls['kolibri:core:logout']());
}

const _setPageVisibility = debounce((store, visibility) => {
  store.commit('CORE_SET_PAGE_VISIBILITY', visibility);
}, 500);

export function setPageVisibility(store) {
  _setPageVisibility(store, document.visibilityState === 'visible');
}

export function getNotifications(store) {
  if (store.getters.isAdmin || store.getters.isSuperuser) {
    return PingbackNotificationResource.fetchCollection()
      .then(notifications => {
        logging.info('Notifications set.');
        store.commit('CORE_SET_NOTIFICATIONS', _notificationListState(notifications));
      })
      .catch(error => {
        store.dispatch('handleApiError', { error });
      });
  }
  return Promise.resolve();
}

export function saveDismissedNotification(store, notification_id) {
  const dismissedNotificationData = {
    user: store.getters.session.user_id,
    notification: notification_id,
  };
  return PingbackNotificationDismissedResource.saveModel({ data: dismissedNotificationData })
    .then(() => {
      store.commit('CORE_REMOVE_NOTIFICATION', notification_id);
    })
    .catch(error => {
      store.dispatch('handleApiError', { error });
    });
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

export function setChannelInfo(store) {
  return ChannelResource.fetchCollection({ getParams: { available: true } }).then(
    channelsData => {
      store.commit('SET_CORE_CHANNEL_LIST', _channelListState(channelsData));
      return channelsData;
    },
    error => {
      store.dispatch('handleApiError', { error });
      return error;
    },
  );
}

export function fetchPoints(store) {
  const { isUserLoggedIn, currentUserId } = store.getters;
  if (isUserLoggedIn && store.state.totalProgress === null) {
    UserProgressResource.fetchModel({ id: currentUserId }).then(progress => {
      store.commit('SET_TOTAL_PROGRESS', progress.progress);
    });
  }
}

// Creates a snackbar that automatically dismisses and has no action buttons.
export function createSnackbar(store, text) {
  store.commit('CORE_CREATE_SNACKBAR', { text, autoDismiss: true });
}

export function clearSnackbar(store) {
  store.commit('CORE_CLEAR_SNACKBAR');
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
