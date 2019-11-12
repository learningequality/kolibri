import debounce from 'lodash/debounce';
import pick from 'lodash/pick';
import logger from 'kolibri.lib.logging';
import {
  SessionResource,
  FacilityResource,
  FacilityDatasetResource,
  ContentSessionLogResource,
  ContentSummaryLogResource,
  MasteryLogResource,
  ChannelResource,
  AttemptLogResource,
  UserProgressResource,
  PingbackNotificationResource,
  PingbackNotificationDismissedResource,
} from 'kolibri.resources';
import { now, setServerTime } from 'kolibri.utils.serverClock';
import urls from 'kolibri.urls';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import { redirectBrowser } from 'kolibri.utils.browser';
import CatchErrors from 'kolibri.utils.CatchErrors';
import Vue from 'kolibri.lib.vue';
import Lockr from 'lockr';
import { baseSessionState } from '../session';
import intervalTimer from '../../../timer';
import {
  MasteryLoggingMap,
  AttemptLoggingMap,
  InteractionTypes,
  LoginErrors,
  ERROR_CONSTANTS,
  UPDATE_MODAL_DISMISSED,
} from '../../../constants';
import samePageCheckGenerator from '../../../utils/samePageCheckGenerator';

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

function _contentSummaryLoggingState(data) {
  let extra_fields = data.extra_fields;
  if (!extra_fields) {
    extra_fields = {};
  } else if (typeof extra_fields === 'string') {
    extra_fields = JSON.parse(extra_fields);
  }
  return {
    id: data.id,
    start_timestamp: data.start_timestamp,
    completion_timestamp: data.completion_timestamp,
    end_timestamp: data.end_timestamp,
    progress: data.progress,
    time_spent: data.time_spent,
    extra_fields: extra_fields,
    time_spent_before_current_session: data.time_spent,
    progress_before_current_session: data.progress,
  };
}

function _contentSessionLoggingState(data) {
  return {
    id: data.id,
    start_timestamp: data.start_timestamp,
    end_timestamp: data.end_timestamp,
    time_spent: data.time_spent,
    extra_fields: data.extra_fields,
    total_time_at_last_save: data.time_spent,
    progress: data.progress,
    progress_at_last_save: data.progress,
  };
}

function _contentSummaryModel(store) {
  const summaryLog = store.getters.logging.summary;
  return {
    user: store.getters.session.user_id,
    start_timestamp: summaryLog.start_timestamp,
    end_timestamp: summaryLog.end_timestamp,
    completion_timestamp: summaryLog.completion_timestamp,
    progress: summaryLog.progress,
    time_spent: summaryLog.time_spent,
    extra_fields: summaryLog.extra_fields,
  };
}

function _contentSessionModel(store) {
  const sessionLog = store.getters.logging.session;
  return {
    start_timestamp: sessionLog.start_timestamp,
    end_timestamp: sessionLog.end_timestamp,
    time_spent: sessionLog.time_spent,
    progress: sessionLog.progress,
    extra_fields: sessionLog.extra_fields,
    user: store.getters.session.user_id,
  };
}

function _masteryLogModel(store) {
  const mapping = {};
  const masteryLog = store.getters.logging.mastery;
  Object.keys(MasteryLoggingMap).forEach(key => {
    mapping[MasteryLoggingMap[key]] = masteryLog[key];
  });
  mapping.summarylog = store.getters.logging.summary.id;
  return mapping;
}

function _attemptLoggingState(data) {
  const state = {};
  Object.keys(AttemptLoggingMap).forEach(key => {
    state[key] = data[AttemptLoggingMap[key]];
  });
  return state;
}

function _attemptLogModel(store) {
  const mapping = {};
  const attemptLog = store.getters.logging.attempt;
  Object.keys(AttemptLoggingMap).forEach(key => {
    mapping[AttemptLoggingMap[key]] = attemptLog[key];
  });
  mapping.masterylog = store.getters.logging.mastery.id;
  return mapping;
}

function _channelListState(data) {
  return data.map(channel => ({
    id: channel.id,
    title: channel.name,
    description: channel.description,
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
 * Signs in user.
 *
 * @param {object} store The store.
 * @param {object} sessionPayload The session payload.
 */
export function kolibriLogin(store, sessionPayload) {
  store.commit('CORE_SET_SIGN_IN_BUSY', true);
  Lockr.set(UPDATE_MODAL_DISMISSED, false);
  return SessionResource.saveModel({ data: sessionPayload })
    .then(() => {
      // OIDC redirect
      if (sessionPayload.next) {
        redirectBrowser(sessionPayload.next);
      }
      // Normal redirect on login
      else {
        redirectBrowser();
      }
    })
    .catch(error => {
      store.commit('CORE_SET_SIGN_IN_BUSY', false);
      const errorsCaught = CatchErrors(error, [
        ERROR_CONSTANTS.INVALID_CREDENTIALS,
        ERROR_CONSTANTS.MISSING_PASSWORD,
      ]);
      if (errorsCaught) {
        if (errorsCaught.includes(ERROR_CONSTANTS.INVALID_CREDENTIALS)) {
          store.commit('CORE_SET_LOGIN_ERROR', LoginErrors.INVALID_CREDENTIALS);
        } else if (errorsCaught.includes(ERROR_CONSTANTS.MISSING_PASSWORD)) {
          store.commit('CORE_SET_LOGIN_ERROR', LoginErrors.PASSWORD_MISSING);
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
  return FacilityResource.fetchCollection().then(facilities => {
    store.commit('CORE_SET_FACILITIES', facilities);
  });
}

export function getFacilityConfig(store, facilityId) {
  const { facilities, currentFacilityId } = store.getters;
  let facId = facilityId || currentFacilityId;
  if (!facId) {
    // No facility Id, so nothing good is going to happen here.
    // Redirect and let Kolibri sort it out.
    return Promise.resolve(redirectBrowser());
  }
  const currentFacility = facilities.find(facility => facility.id === facId);
  let datasetPromise;
  if (currentFacility && typeof currentFacility.dataset === 'object') {
    datasetPromise = Promise.resolve([currentFacility.dataset]);
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
 * Create models to store logging information
 * To be called on page load for content renderers
 */
export function initContentSession(store, { channelId, contentId, contentKind }) {
  // Always clear the logging state when we init the content session,
  // to avoid state pollution.
  store.commit('SET_EMPTY_LOGGING_STATE');

  const promises = [];

  /* Create summary log iff user exists */
  if (store.getters.session.user_id) {
    /* Fetch collection matching content and user */
    const summaryCollectionPromise = ContentSummaryLogResource.fetchCollection({
      getParams: {
        content_id: contentId,
        user_id: store.getters.session.user_id,
      },
      force: true,
    });

    // ensure the store has finished update for summaryLog.
    const summaryPromise = new Promise(resolve => {
      summaryCollectionPromise.then(summary => {
        /* If a summary model exists, map that to the state */
        if (summary.length > 0) {
          store.commit('SET_LOGGING_SUMMARY_STATE', _contentSummaryLoggingState(summary[0]));
          if (summary[0].currentmasterylog) {
            // If a mastery model has been sent along with the summary log payload,
            // then bootstrap that data into the MasteryLog resource. Cheeky!
            const masteryModel = MasteryLogResource.createModel(summary[0].currentmasterylog);
            masteryModel.synced = true;

            store.commit('SET_LOGGING_MASTERY_STATE', summary[0].currentmasterylog);
          }
          resolve();
        } else {
          /* If a summary model does not exist, create default state */
          store.commit(
            'SET_LOGGING_SUMMARY_STATE',
            _contentSummaryLoggingState({
              id: null,
              start_timestamp: now(),
              completion_timestamp: null,
              end_timestamp: now(),
              progress: 0,
              time_spent: 0,
              extra_fields: {},
              time_spent_before_current_session: 0,
              progress_before_current_session: 0,
            })
          );

          const summaryData = Object.assign(
            {
              channel_id: channelId,
              content_id: contentId,
              kind: contentKind,
            },
            _contentSummaryModel(store)
          );

          /* Save a new summary model and set id on state */
          ContentSummaryLogResource.saveModel({ data: summaryData }).then(newSummary => {
            store.commit('SET_LOGGING_SUMMARY_ID', newSummary.id);
            resolve();
          });
        }
      });
    });
    promises.push(summaryPromise);
  }

  /* Set session log state to default */
  store.commit(
    'SET_LOGGING_SESSION_STATE',
    _contentSessionLoggingState({
      id: null,
      start_timestamp: now(),
      end_timestamp: now(),
      time_spent: 0,
      progress: 0,
      extra_fields: {},
    })
  );

  const sessionData = Object.assign(
    {
      channel_id: channelId,
      content_id: contentId,
      kind: contentKind,
    },
    _contentSessionModel(store)
  );

  /* Save a new session model and set id on state */
  const sessionModelPromise = ContentSessionLogResource.saveModel({ data: sessionData });

  // ensure the store has finished update for sessionLog.
  const sessionPromise = new Promise(resolve => {
    sessionModelPromise.then(newSession => {
      store.commit('SET_LOGGING_SESSION_ID', newSession.id);
      resolve();
    });
  });
  promises.push(sessionPromise);

  return Promise.all(promises);
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

function saveContentSessionLog(store, id, data) {
  ContentSessionLogResource.saveModel({ id, data }).catch(error => {
    handleApiError(store, error);
  });
}

const debouncedSaveContentSessionLog = debounce(saveContentSessionLog, 1000, { maxWait: 5000 });

function saveContentSummaryLog(store, id, data) {
  ContentSummaryLogResource.saveModel({ id, data }).catch(error => {
    handleApiError(store, error);
  });
}

const debouncedSaveContentSummaryLog = debounce(saveContentSummaryLog, 1000, { maxWait: 5000 });

/**
 * Do a PATCH to update existing logging models
 * Must be called after initContentSession
 */
export function saveLogs(store) {
  /* Create aliases for logs */
  const summaryLog = store.getters.logging.summary;
  const sessionLog = store.getters.logging.session;

  /* Reset values used for threshold checking */
  store.commit('SET_LOGGING_THRESHOLD_CHECKS', {
    progress: sessionLog.progress,
    timeSpent: sessionLog.time_spent,
  });

  /* If a session model exists, save it with updated values */
  if (sessionLog.id) {
    const contentSession = _contentSessionModel(store);
    // Get all data from the vuex store synchronously, but then debounce the save to
    // prevent repeated saves to the server.
    debouncedSaveContentSessionLog(store, sessionLog.id, contentSession);
  }

  /* If a summary model exists, save it with updated values */
  if (summaryLog.id) {
    const contentSummary = _contentSummaryModel(store);
    // Get all data from the vuex store synchronously, but then debounce the save to
    // prevent repeated saves to the server.
    debouncedSaveContentSummaryLog(store, summaryLog.id, contentSummary);
  }
}

export function fetchPoints(store) {
  const { isUserLoggedIn, currentUserId, totalProgress } = store.getters;
  if (isUserLoggedIn && totalProgress === null) {
    UserProgressResource.fetchModel({ id: currentUserId }).then(progress => {
      store.commit('SET_TOTAL_PROGRESS', progress.progress);
    });
  }
}

/**
 * Helper function to handle common functionality between updateProgress and updateExerciseProgress
 * @param  {VuexStore} store        The currently active Vuex store
 * @param  {Number} sessionProgress The progress made in this session
 * @param  {[type]} summaryProgress The progress made on this content overall
 * @param {boolean} forceSave       Force saving of logs?
 */
function _updateProgress(store, sessionProgress, summaryProgress, forceSave = false) {
  /* Create aliases for logs */
  const summaryLog = store.getters.logging.summary;
  const sessionLog = store.getters.logging.session;

  /* Store original value to check if 100% reached this iteration */
  const originalProgress = summaryLog.progress;

  /* Update the logging state with new progress information */
  store.commit('SET_LOGGING_PROGRESS', { sessionProgress, summaryProgress });

  /* Mark completion time if 100% progress reached
   * Also, increase totalProgress model to avoid a refetch from server
   */
  const completedContent = originalProgress < 1 && summaryProgress === 1;
  const { isUserLoggedIn } = store.getters;
  if (completedContent) {
    store.commit('SET_LOGGING_COMPLETION_TIME', now());
    if (isUserLoggedIn) {
      store.commit('INCREMENT_TOTAL_PROGRESS', 1);
    }
  }
  /* Determine if progress threshold has been met */
  const progressThresholdMet =
    sessionProgress - sessionLog.progress_at_last_save >= progressThreshold;

  /* Save models if needed */
  if (forceSave || completedContent || progressThresholdMet) {
    if (store.state.pageVisible) {
      // Only update logs if page is currently visible, prevent background tabs
      // from generating server load.
      saveLogs(store);
    }
  }
  return summaryProgress;
}

/**
 * Update the progress percentage
 * To be called periodically by content renderers on interval or on pause
 * Must be called after initContentSession
 * @param {float} progressPercent
 * @param {boolean} forceSave
 */
export function updateProgress(store, { progressPercent, forceSave = false }) {
  /* Create aliases for logs */
  const summaryLog = store.getters.logging.summary;
  const sessionLog = store.getters.logging.session;

  /* Calculate progress based on progressPercent */
  // TODO rtibbles: Delegate this to the renderers?
  progressPercent = progressPercent || 0;
  const sessionProgress = Math.min(1, sessionLog.progress + progressPercent);
  const summaryProgress = summaryLog.id
    ? Math.min(1, summaryLog.progress_before_current_session + sessionProgress)
    : 0;

  return _updateProgress(store, sessionProgress, summaryProgress, forceSave);
}

/**
summary and session log progress update for exercise
**/
export function updateExerciseProgress(store, { progressPercent }) {
  /* Update the logging state with new progress information */
  progressPercent = progressPercent || 0;
  return _updateProgress(store, progressPercent, progressPercent, true);
}

/**
 * Update the total time spent and end time stamps
 * To be called periodically by interval timer
 * Must be called after initContentSession
 * @param {boolean} forceSave
 */
export function updateTimeSpent(store, forceSave = false) {
  /* Create aliases for logs */
  const summaryLog = store.getters.logging.summary;
  const sessionLog = store.getters.logging.session;

  /* Calculate new times based on how much time has passed since last save */
  const sessionTime = intervalTimer.getNewTimeElapsed() + sessionLog.time_spent;
  const summaryTime = summaryLog.id
    ? sessionTime + summaryLog.time_spent_before_current_session
    : 0;

  /* Update the logging state with new timing information */
  store.commit('SET_LOGGING_TIME', { sessionTime, summaryTime, currentTime: now() });

  /* Determine if time threshold has been met */
  const timeThresholdMet =
    sessionLog.time_spent - sessionLog.total_time_at_last_save >= timeThreshold;

  /* Save models if needed */
  if (forceSave || timeThresholdMet) {
    saveLogs(store);
  }
}

/**
 * Update the content state in the summary log
 * To be called periodically by interval timer
 * Must be called after initContentSession
 * @param {boolean} forceSave
 */
export function updateContentState(store, { contentState, forceSave = false }) {
  /* Update the logging state with new content state information */
  store.commit('SET_LOGGING_CONTENT_STATE', contentState);

  // update the time spent value to check time since last save
  // and save if necessary, or save then reset the timer if forceSave
  // is true
  updateTimeSpent(store, forceSave);
}

/**
 * Start interval timer and set start time
 * @param {int} interval
 */
export function startTrackingProgress(store, interval = intervalTime) {
  intervalTimer.startTimer(interval, () => {
    updateTimeSpent(store, false);
  });
}

/**
 * Stop interval timer and update latest times
 * Must be called after startTrackingProgress
 */
export function stopTrackingProgress(store) {
  intervalTimer.stopTimer();
  updateTimeSpent(store, true);
}

export function saveMasteryLog(store) {
  return MasteryLogResource.saveModel({
    id: store.getters.logging.mastery.id,
    data: _masteryLogModel(store),
  });
}

export function saveAndStoreMasteryLog(store) {
  return saveMasteryLog(store).only(samePageCheckGenerator(store), newMasteryLog => {
    store.commit('SET_LOGGING_MASTERY_STATE', newMasteryLog);
  });
}

export function setMasteryLogComplete(store, completetime) {
  store.commit('SET_LOGGING_MASTERY_COMPLETE', completetime);
}

function createMasteryLog(store, { masteryLevel, masteryCriterion }) {
  const data = {
    id: null,
    user: store.getters.session.user_id,
    summarylog: store.getters.logging.summary.id,
    start_timestamp: now(),
    completion_timestamp: null,
    end_timestamp: null,
    mastery_level: masteryLevel,
    complete: false,
    responsehistory: [],
    pastattempts: [],
    totalattempts: 0,
    mastery_criterion: masteryCriterion,
  };
  // Preemptively set attributes
  store.commit('SET_LOGGING_MASTERY_STATE', data);
  // Save to the server
  return MasteryLogResource.saveModel({
    data,
  }).only(samePageCheckGenerator(store), newMasteryLog => {
    // Update store in case an id has been set.
    store.commit('SET_LOGGING_MASTERY_STATE', newMasteryLog);
  });
}

export function createDummyMasteryLog(store) {
  /*
  Create a client side masterylog for anonymous user for tracking attempt-progress.
  This masterylog will never be saved in the database.
  */
  const data = {
    id: null,
    summarylog: null,
    start_timestamp: null,
    completion_timestamp: null,
    end_timestamp: null,
    mastery_level: null,
    complete: false,
    responsehistory: [],
    pastattempts: [],
    mastery_criterion: null,
    totalattempts: 0,
  };
  store.commit('SET_LOGGING_MASTERY_STATE', data);
}

export function saveAttemptLog(store) {
  const attemptLogModel = AttemptLogResource.findModel({
    item: store.getters.logging.attempt.item,
  });
  if (attemptLogModel) {
    return attemptLogModel.save(_attemptLogModel(store));
  }
  return ConditionalPromise.resolve();
}

export function saveAndStoreAttemptLog(store) {
  const attemptLogId = store.getters.logging.attempt.id;
  const attemptLogItem = store.getters.logging.attempt.item;
  /*
   * Create a 'same item' check instead of same page check, which only allows the resulting save
   * payload to be set if two conditions are met: firstly, that at the time the save was
   * initiated, the attemptlog did not have an id, we need this id for future updating saves,
   * but no other information saved to the server needs to be persisted back into the vuex store;
   * secondly, we check that the item id when the save has resolved is the same as when the save
   * was initiated, ensuring that we are not overwriting the vuex attemptlog representation for a
   * different question.
   */
  const sameItemAndNoLogIdCheck = () =>
    !attemptLogId && attemptLogItem === store.getters.logging.attempt.item;
  return saveAttemptLog(store).only(sameItemAndNoLogIdCheck, newAttemptLog => {
    // mainly we want to set the attemplot id, so we can PATCH subsequent save on this attemptLog
    store.commit('SET_LOGGING_ATTEMPT_STATE', _attemptLoggingState(newAttemptLog));
  });
}

export function createAttemptLog(store, itemId) {
  const { isUserLoggedIn, currentUserId, logging } = store.getters;
  const user = isUserLoggedIn ? currentUserId : null;
  const attemptLogModel = AttemptLogResource.createModel({
    id: null,
    user,
    masterylog: logging.mastery.id || null,
    sessionlog: logging.session.id,
    start_timestamp: now(),
    completion_timestamp: null,
    end_timestamp: null,
    item: itemId,
    complete: false,
    time_spent: 0,
    correct: 0,
    answer: {},
    simple_answer: '',
    interaction_history: [],
    hinted: false,
  });
  store.commit('SET_LOGGING_ATTEMPT_STATE', attemptLogModel.attributes);
}

const interactionHistoryProperties = ['type', 'correct', 'answer', 'timestamp'];

export function updateAttemptLogInteractionHistory(store, interaction) {
  Object.keys(interaction).forEach(key => {
    if (interactionHistoryProperties.indexOf(key) === -1) {
      throw new TypeError(`${key} not allowed for interaction log`);
    }
  });
  if (!interaction.type || !InteractionTypes[interaction.type]) {
    throw new TypeError('No interaction type, or invalid interaction type specified');
  }
  if (!interaction.timestamp) {
    interaction.timestamp = now();
  }
  store.commit('UPDATE_LOGGING_ATTEMPT_INTERACTION_HISTORY', interaction);
  // Also update end timestamp on Mastery model.
  store.commit('UPDATE_LOGGING_MASTERY', { currentTime: now() });
}

/**
 * Initialize assessment mastery log
 */
export function initMasteryLog(store, { masterySpacingTime, masteryCriterion }) {
  const { mastery } = store.getters.logging;
  if (!mastery.id) {
    // id has not been set on the masterylog state, so this is undefined.
    // Either way, we need to create a new masterylog, with a masterylevel of 1!
    return createMasteryLog(store, { masteryLevel: 1, masteryCriterion });
  } else if (
    mastery.complete &&
    now() - new Date(mastery.completion_timestamp) > masterySpacingTime
  ) {
    // The most recent masterylog is complete, and they completed it more than
    // masterySpacingTime time ago!
    // This means we need to level the user up.
    return createMasteryLog(store, {
      masteryLevel: mastery.mastery_level + 1,
      masteryCriterion,
    });
  }
  return Promise.resolve();
}

export function updateMasteryAttemptState(
  store,
  { currentTime, correct, complete, firstAttempt, hinted, answerState, simpleAnswer, error }
) {
  store.commit('UPDATE_LOGGING_MASTERY', { currentTime, correct, firstAttempt, hinted, error });
  store.commit('UPDATE_LOGGING_ATTEMPT', {
    currentTime,
    correct,
    firstAttempt,
    complete,
    hinted,
    answerState,
    simpleAnswer,
    error,
  });
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
