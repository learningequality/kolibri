import debounce from 'lodash/debounce';
import isNumber from 'lodash/isNumber';
import isPlainObject from 'lodash/isPlainObject';
import isUndefined from 'lodash/isUndefined';
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
import { redirectBrowser } from 'kolibri.utils.redirectBrowser';
import CatchErrors from 'kolibri.utils.CatchErrors';
import Vue from 'kolibri.lib.vue';
import Lockr from 'lockr';
import { baseSessionState } from '../session';
import intervalTimer from '../../../timer';
import { LoginErrors, ERROR_CONSTANTS, UPDATE_MODAL_DISMISSED } from '../../../constants';
import { browser, os } from '../../../utils/browserInfo';
import errorCodes from './../../../disconnectionErrorCodes.js';

const logging = logger.getLogger(__filename);
const intervalTime = 5000; // Frequency at which time logging is updated
const progressThreshold = 0.4; // Update logs if user has reached 40% more progress
const timeThreshold = 120; // Update logs if 120 seconds have passed since last update

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

export function handleApiError(store, errorObject) {
  let error = errorObject;
  if (typeof errorObject === 'object' && !(errorObject instanceof Error)) {
    error = JSON.stringify(errorObject, null, 2);
  } else if (errorObject.response) {
    if (errorCodes.includes(errorObject.response.status)) {
      // Do not log errors for disconnections, as it disrupts the user experience
      // and should already be being handled by our disconnection overlay.
      return;
    }
    // Reassign object properties here as Axios error objects have built in
    // pretty printing support which messes with this.
    error = JSON.stringify(errorObject.response, null, 2);
  } else if (errorObject instanceof Error) {
    error = errorObject.toString();
  }
  handleError(store, error);
  throw errorObject;
}

/**
 * Used to prevent inadvertent actions if a user double-clicks to navigate
 *
 * Something of a hack. A better strategy would be to create a new
 * `setLoading` action which handles both `state.core.loading` and
 * `state.core.blockDoubleClicks` with a single function.
 */
export function blockDoubleClicks(store) {
  if (!store.state.blockDoubleClicks) {
    store.commit('CORE_BLOCK_CLICKS', true);
    setTimeout(() => {
      store.commit('CORE_BLOCK_CLICKS', false);
    }, 500);
  }
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
      ]);
      if (errorsCaught) {
        if (errorsCaught.includes(ERROR_CONSTANTS.INVALID_CREDENTIALS)) {
          return LoginErrors.INVALID_CREDENTIALS;
        } else if (errorsCaught.includes(ERROR_CONSTANTS.MISSING_PASSWORD)) {
          return LoginErrors.PASSWORD_MISSING;
        } else if (errorsCaught.includes(ERROR_CONSTANTS.PASSWORD_NOT_SPECIFIED)) {
          return LoginErrors.PASSWORD_NOT_SPECIFIED;
        }
      } else {
        store.dispatch('handleApiError', error);
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
        store.dispatch('handleApiError', error);
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
      store.dispatch('handleApiError', error);
    });
}

export function getFacilities(store) {
  return FacilityResource.fetchCollection({ force: true }).then(facilities => {
    store.commit('CORE_SET_FACILITIES', [...facilities]);
  });
}

export function getFacilityConfig(store, facilityId) {
  const { currentFacilityId, selectedFacility } = store.getters;
  let facId = facilityId || currentFacilityId;
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

/**
 * Initialize a content session for progress tracking
 * To be called on page load for content renderers
 */
export function initContentSession(store, { nodeId, lessonId, quizId } = {}) {
  if (!nodeId && !quizId) {
    throw TypeError('Must define either nodeId or quizId');
  }
  if ((nodeId || lessonId) && quizId) {
    throw TypeError('quizId must be the only defined parameter if defined');
  }
  let sessionStarted = false;

  if (quizId) {
    sessionStarted = store.state.logging.context && store.state.logging.context.quiz_id === quizId;
  }

  if (nodeId) {
    sessionStarted = store.state.logging.context && store.state.logging.context.node_id === nodeId;
    if (lessonId) {
      sessionStarted =
        sessionStarted &&
        store.state.logging.context &&
        store.state.logging.context.lesson_id === lessonId;
    }
  }

  if (sessionStarted) {
    return;
  }

  // Always clear the logging state when we init the content session,
  // to avoid state pollution.
  store.commit('SET_EMPTY_LOGGING_STATE');

  return client({
    method: 'post',
    url: urls['kolibri:core:trackprogress-list'](),
    data: { node_id: nodeId, lesson_id: lessonId, quiz_id: quizId },
  }).then(response => {
    store.commit('INITIALIZE_LOGGING_STATE', response.data);
  });
}

function _zeroToOne(num) {
  return Math.min(1, Math.max(num || 0, 0));
}

function immediatelyUpdateContentSession(store, attempt) {
  const progress_delta = store.state.logging.progress_delta;
  const time_spent_delta = store.state.logging.time_spent_delta;
  const extra_fields = store.state.logging.extra_fields;
  const extra_fields_dirty_bit = store.state.logging.extra_fields_dirty_bit;
  const progress = store.state.logging.progress;

  // Always update if there's an attempt
  if (
    !store.state.logging.saving &&
    (!isUndefined(attempt) ||
      progress_delta >= progressThreshold ||
      (progress_delta && progress >= 1) ||
      time_spent_delta >= timeThreshold ||
      extra_fields_dirty_bit)
  ) {
    store.commit('LOGGING_SAVING');
    const data = {};
    if (progress_delta) {
      data.progress_delta = progress_delta;
    }
    if (time_spent_delta) {
      data.time_spent_delta = time_spent_delta;
    }
    if (!isUndefined(attempt)) {
      data.attempt = attempt;
    }
    if (extra_fields_dirty_bit) {
      data.extra_fields = extra_fields;
    }
    return client({
      method: 'put',
      url: urls['kolibri:core:trackprogress-detail'](store.state.logging.session_id),
      data,
    }).then(response => {
      if (response.data.attempt) {
        store.commit('ADD_OR_UPDATE_ATTEMPT', response.data.attempt);
      }
      store.commit('LOGGING_SAVED');
      return response.data;
    });
  }
}

const debouncedUpdateContentSession = debounce(immediatelyUpdateContentSession, 2000);

/**
 * Update a content session for progress tracking
 */
export function updateContentSession(
  store,
  { progressDelta, progress, contentState, attempt, immediate = false } = {}
) {
  if (!isUndefined(progressDelta) && !isUndefined(progress)) {
    throw TypeError('Must only specify either progressDelta or progress');
  }
  if (!isUndefined(progress)) {
    if (!isNumber(progress)) {
      throw TypeError('progress must be a number');
    }
    progress = _zeroToOne(progress);
    store.commit('SET_LOGGING_PROGRESS', progress);
  }
  if (!isUndefined(progressDelta)) {
    if (!isNumber(progressDelta)) {
      throw TypeError('progressDelta must be a number');
    }
    progressDelta = _zeroToOne(progressDelta);
    store.commit('ADD_LOGGING_PROGRESS', progressDelta);
  }
  // Reset the elapsed time in the timer
  const elapsedTime = intervalTimer.getNewTimeElapsed();
  // Discard the time that has passed if the page is not visible.
  if (store.state.pageVisible) {
    /* Update the logging state with new timing information */
    store.commit('UPDATE_LOGGING_TIME', elapsedTime);
  }
  if (!isUndefined(contentState)) {
    if (!isPlainObject(contentState)) {
      throw TypeError('contentState must be an object');
    }
    store.commit('SET_LOGGING_CONTENT_STATE', contentState);
  }
  if (!isUndefined(attempt)) {
    if (!isPlainObject(attempt)) {
      throw TypeError('attempt must be an object');
    }
    store.commit('ADD_OR_UPDATE_ATTEMPT', attempt);
  }

  if (store.getters.isUserLoggedIn && store.state.logging.progress >= 1) {
    store.commit('INCREMENT_TOTAL_PROGRESS', 1);
  }

  if (!isUndefined(attempt) || immediate) {
    return immediatelyUpdateContentSession(store, attempt);
  } else {
    return debouncedUpdateContentSession(store);
  }
}

/**
 * Start interval timer and set start time
 * @param {int} interval
 */
export function startTrackingProgress(store, interval = intervalTime) {
  intervalTimer.startTimer(interval, () => {
    updateContentSession(store);
  });
}

/**
 * Stop interval timer and update latest times
 * Must be called after startTrackingProgress
 */
export function stopTrackingProgress(store) {
  intervalTimer.stopTimer();
  updateContentSession(store, { immediate: true }).then(() => {
    store.commit('SET_EMPTY_LOGGING_STATE');
  });
}

export function setChannelInfo(store) {
  return ChannelResource.fetchCollection({ getParams: { available: true } }).then(
    channelsData => {
      store.commit('SET_CORE_CHANNEL_LIST', _channelListState(channelsData));
      return channelsData;
    },
    error => {
      store.dispatch('handleApiError', error);
      return error;
    }
  );
}

export function fetchPoints(store) {
  const { isUserLoggedIn, currentUserId, totalProgress } = store.getters;
  if (isUserLoggedIn && totalProgress === null) {
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
        store.dispatch('handleApiError', error);
        return error;
      }
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
        store.dispatch('handleApiError', error);
        return error;
      }
    );
  }
}
