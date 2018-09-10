import debounce from 'lodash/debounce';
import {
  isUserLoggedIn,
  currentUserId,
  isSuperuser,
  isAdmin,
  isCoach,
  currentFacilityId,
  facilities,
} from 'kolibri.coreVue.vuex.getters';
import * as CoreMappers from 'kolibri.coreVue.vuex.mappers';
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
} from 'kolibri.resources';
import { now } from 'kolibri.utils.serverClock';
import urls from 'kolibri.urls';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import { redirectBrowser } from 'kolibri.utils.browser';
import { createTranslator } from 'kolibri.utils.i18n';
import intervalTimer from '../timer';
import { MasteryLoggingMap, AttemptLoggingMap, InteractionTypes, LoginErrors } from '../constants';

const name = 'coreTitles';

const messages = {
  errorPageTitle: 'Error',
};

const translator = createTranslator(name, messages);

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
  const state = {
    id: data.pk,
    start_timestamp: data.start_timestamp,
    completion_timestamp: data.completion_timestamp,
    end_timestamp: data.end_timestamp,
    progress: data.progress,
    time_spent: data.time_spent,
    extra_fields: data.extra_fields,
    time_spent_before_current_session: data.time_spent,
    progress_before_current_session: data.progress,
  };
  return state;
}

function _contentSessionLoggingState(data) {
  const state = {
    id: data.pk,
    start_timestamp: data.start_timestamp,
    end_timestamp: data.end_timestamp,
    time_spent: data.time_spent,
    extra_fields: data.extra_fields,
    total_time_at_last_save: data.time_spent,
    progress: data.progress,
    progress_at_last_save: data.progress,
  };
  return state;
}

function _contentSummaryModel(store) {
  const summaryLog = store.state.core.logging.summary;
  const mapping = {
    user: store.state.core.session.user_id,
    start_timestamp: summaryLog.start_timestamp,
    end_timestamp: summaryLog.end_timestamp,
    completion_timestamp: summaryLog.completion_timestamp,
    progress: summaryLog.progress,
    time_spent: summaryLog.time_spent,
    extra_fields: summaryLog.extra_fields,
  };
  return mapping;
}

function _contentSessionModel(store) {
  const sessionLog = store.state.core.logging.session;
  return {
    start_timestamp: sessionLog.start_timestamp,
    end_timestamp: sessionLog.end_timestamp,
    time_spent: sessionLog.time_spent,
    progress: sessionLog.progress,
    extra_fields: sessionLog.extra_fields,
    user: store.state.core.session.user_id,
  };
}

function _sessionState(data) {
  return {
    id: data.id,
    username: data.username,
    full_name: data.full_name,
    user_id: data.user_id,
    facility_id: data.facility_id,
    kind: data.kind,
    error: data.error,
    can_manage_content: data.can_manage_content,
  };
}

function _masteryLogModel(store) {
  const mapping = {};
  const masteryLog = store.state.core.logging.mastery;
  Object.keys(MasteryLoggingMap).forEach(key => {
    mapping[MasteryLoggingMap[key]] = masteryLog[key];
  });
  mapping.summarylog = store.state.core.logging.summary.id;
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
  const attemptLog = store.state.core.logging.attempt;
  Object.keys(AttemptLoggingMap).forEach(key => {
    mapping[AttemptLoggingMap[key]] = attemptLog[key];
  });
  mapping.masterylog = store.state.core.logging.mastery.id;
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

/**
 * Actions
 *
 * These methods are used to update client-side state
 */

function handleError(store, errorString) {
  store.dispatch('CORE_SET_ERROR', errorString);
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_TITLE', translator.$tr('errorPageTitle'));
}

function handleApiError(store, errorObject) {
  handleError(store, JSON.stringify(errorObject, null, '\t'));
}

/**
 * Used to prevent inadvertent actions if a user double-clicks to navigate
 *
 * Something of a hack. A better strategy would be to create a new
 * `setLoading` action which handles both `state.core.loading` and
 * `state.core.blockDoubleClicks` with a single function.
 */
function blockDoubleClicks(store) {
  if (!store.state.core.blockDoubleClicks) {
    store.dispatch('CORE_BLOCK_CLICKS', true);
    setTimeout(() => {
      store.dispatch('CORE_BLOCK_CLICKS', false);
    }, 500);
  }
}

/**
 * Signs in user.
 *
 * @param {object} store The store.
 * @param {object} sessionPayload The session payload.
 * @param {boolean} isFirstDeviceSignIn Whether it's the first time singining in after setup wizard.
 */
function kolibriLogin(store, sessionPayload, isFirstDeviceSignIn) {
  store.dispatch('CORE_SET_SIGN_IN_BUSY', true);
  const sessionModel = SessionResource.createModel(sessionPayload);
  const sessionPromise = sessionModel.save(sessionPayload);
  return sessionPromise
    .then(session => {
      store.dispatch('CORE_SET_SESSION', _sessionState(session));
      const facilityURL = urls['kolibri:facilitymanagementplugin:facility_management']();
      const deviceURL = urls['kolibri:devicemanagementplugin:device_management']();
      const coachURL = urls['kolibri:coach:coach']();
      if (isFirstDeviceSignIn) {
        // Hacky way to redirect to content import page after completing setup wizard
        redirectBrowser(`${window.location.origin}${deviceURL}#/welcome`);
      } else if (isSuperuser(store.state) || isAdmin(store.state)) {
        /* Very hacky solution to redirect an admin or superuser to Manage tab on login*/
        redirectBrowser(window.location.origin + facilityURL);
      } else if (isCoach(store.state)) {
        /* Even more hacky solution to redirect a coach to Coach tab on login*/
        redirectBrowser(window.location.origin + coachURL);
      } else {
        redirectBrowser();
      }
    })
    .catch(error => {
      store.dispatch('CORE_SET_SIGN_IN_BUSY', false);
      if (error.status.code === 401) {
        store.dispatch('CORE_SET_LOGIN_ERROR', LoginErrors.INVALID_CREDENTIALS);
      } else if (error.status.code === 400 && error.entity.missing_field === 'password') {
        store.dispatch('CORE_SET_LOGIN_ERROR', LoginErrors.PASSWORD_MISSING);
      } else {
        handleApiError(store, error);
      }
    });
}

function kolibriLogout(store) {
  const sessionModel = SessionResource.getModel('current');
  const logoutPromise = sessionModel.delete();
  return logoutPromise
    .then(() => {
      /* Very hacky solution to redirect a user back to Learn tab on logout*/
      redirectBrowser();
    })
    .catch(error => {
      handleApiError(store, error);
    });
}

function getCurrentSession(store, force = false) {
  let sessionPromise;
  if (force) {
    sessionPromise = SessionResource.getModel('current').fetch({}, true)._promise;
  } else {
    sessionPromise = SessionResource.getModel('current').fetch()._promise;
  }
  return sessionPromise
    .then(session => {
      logging.info('Session set.');
      store.dispatch('CORE_SET_SESSION', _sessionState(session));
      return session;
    })
    .catch(error => {
      handleApiError(store, error);
    });
}

function getFacilities(store) {
  return FacilityResource.getCollection()
    .fetch()
    .then(facilities => {
      store.dispatch('CORE_SET_FACILITIES', facilities);
    });
}

function getFacilityConfig(store, facilityId = currentFacilityId(store.state)) {
  const currentFacility = facilities(store.state).find(facility => facility.id === facilityId);
  let datasetPromise;
  if (currentFacility && typeof currentFacility.dataset === 'object') {
    datasetPromise = Promise.resolve([currentFacility.dataset]);
  } else {
    datasetPromise = FacilityDatasetResource.getCollection({
      // getCollection for currentSession's facilityId if none was passed
      facility_id: facilityId,
    }).fetch();
  }

  return datasetPromise.then(facilityConfig => {
    let config = {};
    const facility = facilityConfig[0];
    if (facility) {
      config = CoreMappers.convertKeysToCamelCase(facility);
    }
    store.dispatch('CORE_SET_FACILITY_CONFIG', config);
  });
}

/**
 * Create models to store logging information
 * To be called on page load for content renderers
 */
function initContentSession(store, channelId, contentId, contentKind) {
  // Always clear the logging state when we init the content session,
  // to avoid state pollution.
  store.dispatch('SET_EMPTY_LOGGING_STATE');

  const promises = [];

  /* Create summary log iff user exists */
  if (store.state.core.session.user_id) {
    /* Fetch collection matching content and user */
    const summaryCollection = ContentSummaryLogResource.getCollection({
      content_id: contentId,
      user_id: store.state.core.session.user_id,
    });
    const summaryCollectionPromise = summaryCollection.fetch({}, true);

    // ensure the store has finished update for summaryLog.
    const summaryPromise = new Promise(resolve => {
      summaryCollectionPromise.then(summary => {
        /* If a summary model exists, map that to the state */
        if (summary.length > 0) {
          store.dispatch('SET_LOGGING_SUMMARY_STATE', _contentSummaryLoggingState(summary[0]));
          if (summary[0].currentmasterylog) {
            // If a mastery model has been sent along with the summary log payload,
            // then bootstrap that data into the MasteryLog resource. Cheeky!
            const masteryModel = MasteryLogResource.createModel(summary[0].currentmasterylog);
            masteryModel.synced = true;

            store.dispatch('SET_LOGGING_MASTERY_STATE', summary[0].currentmasterylog);
          }
          resolve();
        } else {
          /* If a summary model does not exist, create default state */
          store.dispatch(
            'SET_LOGGING_SUMMARY_STATE',
            _contentSummaryLoggingState({
              pk: null,
              start_timestamp: now(),
              completion_timestamp: null,
              end_timestamp: now(),
              progress: 0,
              time_spent: 0,
              extra_fields: '{}',
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
          const summaryModel = ContentSummaryLogResource.createModel(summaryData);
          const summaryModelPromise = summaryModel.save();
          summaryModelPromise.then(newSummary => {
            store.dispatch('SET_LOGGING_SUMMARY_ID', newSummary.pk);
            resolve();
          });
        }
      });
    });
    promises.push(summaryPromise);
  }

  /* Set session log state to default */
  store.dispatch(
    'SET_LOGGING_SESSION_STATE',
    _contentSessionLoggingState({
      pk: null,
      start_timestamp: now(),
      end_timestamp: now(),
      time_spent: 0,
      progress: 0,
      extra_fields: '{}',
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
  const sessionModel = ContentSessionLogResource.createModel(sessionData);
  const sessionModelPromise = sessionModel.save();

  // ensure the store has finished update for sessionLog.
  const sessionPromise = new Promise(resolve => {
    sessionModelPromise.then(newSession => {
      store.dispatch('SET_LOGGING_SESSION_ID', newSession.pk);
      resolve();
    });
  });
  promises.push(sessionPromise);

  return Promise.all(promises);
}

function setChannelInfo(store) {
  return ChannelResource.getCollection({ available: true })
    .fetch()
    .then(
      channelsData => {
        store.dispatch('SET_CORE_CHANNEL_LIST', _channelListState(channelsData));
        return channelsData;
      },
      error => {
        handleApiError(store, error);
        return error;
      }
    );
}

function saveContentSessionLog(store, sessionModel, contentSession) {
  sessionModel.save(contentSession).catch(error => {
    handleApiError(store, error);
  });
}

const debouncedSaveContentSessionLog = debounce(saveContentSessionLog, 1000, { maxWait: 5000 });

function saveContentSummaryLog(store, summaryModel, contentSummary) {
  summaryModel.save(contentSummary).catch(error => {
    handleApiError(store, error);
  });
}

const debouncedSaveContentSummaryLog = debounce(saveContentSummaryLog, 1000, { maxWait: 5000 });

/**
 * Do a PATCH to update existing logging models
 * Must be called after initContentSession
 */
function saveLogs(store) {
  /* Create aliases for logs */
  const summaryLog = store.state.core.logging.summary;
  const sessionLog = store.state.core.logging.session;

  /* Reset values used for threshold checking */
  store.dispatch('SET_LOGGING_THRESHOLD_CHECKS', sessionLog.progress, sessionLog.time_spent);

  /* If a session model exists, save it with updated values */
  if (sessionLog.id) {
    const sessionModel = ContentSessionLogResource.getModel(sessionLog.id);
    const contentSession = _contentSessionModel(store);
    // Get all data from the vuex store synchronously, but then debounce the save to
    // prevent repeated saves to the server.
    debouncedSaveContentSessionLog(store, sessionModel, contentSession);
  }

  /* If a summary model exists, save it with updated values */
  if (summaryLog.id) {
    const summaryModel = ContentSummaryLogResource.getModel(summaryLog.id);
    const contentSummary = _contentSummaryModel(store);
    // Get all data from the vuex store synchronously, but then debounce the save to
    // prevent repeated saves to the server.
    debouncedSaveContentSummaryLog(store, summaryModel, contentSummary);
  }
}

function fetchPoints(store) {
  if (isUserLoggedIn(store.state)) {
    const userProgressModel = UserProgressResource.getModel(currentUserId(store.state));
    userProgressModel.fetch().then(progress => {
      store.dispatch('SET_TOTAL_PROGRESS', progress.progress);
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
  const summaryLog = store.state.core.logging.summary;
  const sessionLog = store.state.core.logging.session;

  /* Store original value to check if 100% reached this iteration */
  const originalProgress = summaryLog.progress;

  /* Update the logging state with new progress information */
  store.dispatch('SET_LOGGING_PROGRESS', sessionProgress, summaryProgress);

  /* Mark completion time if 100% progress reached
   * Also, increase totalProgress model to avoid a refetch from server
   */
  const completedContent = originalProgress < 1 && summaryProgress === 1;
  if (completedContent) {
    store.dispatch('SET_LOGGING_COMPLETION_TIME', now());
    if (isUserLoggedIn(store.state)) {
      const userProgressModel = UserProgressResource.getModel(currentUserId(store.state));
      // Fetch first to ensure we never accidentally have an undefined progress
      userProgressModel.fetch().then(progress => {
        userProgressModel.set({
          progress: progress.progress + 1,
        });
      });
      fetchPoints(store);
    }
  }
  /* Determine if progress threshold has been met */
  const progressThresholdMet =
    sessionProgress - sessionLog.progress_at_last_save >= progressThreshold;

  /* Save models if needed */
  if (forceSave || completedContent || progressThresholdMet) {
    saveLogs(store);
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
function updateProgress(store, progressPercent, forceSave = false) {
  /* Create aliases for logs */
  const summaryLog = store.state.core.logging.summary;
  const sessionLog = store.state.core.logging.session;

  /* Calculate progress based on progressPercent */
  // TODO rtibbles: Delegate this to the renderers?
  progressPercent = progressPercent || 0;
  const sessionProgress = sessionLog.progress + progressPercent;
  const summaryProgress = summaryLog.id
    ? Math.min(1, summaryLog.progress_before_current_session + sessionProgress)
    : 0;

  return _updateProgress(store, sessionProgress, summaryProgress, forceSave);
}

/**
summary and session log progress update for exercise
**/
function updateExerciseProgress(store, progressPercent, forceSave = false) {
  /* Update the logging state with new progress information */
  progressPercent = progressPercent || 0;
  return _updateProgress(store, progressPercent, progressPercent, forceSave);
}

/**
 * Update the total time spent and end time stamps
 * To be called periodically by interval timer
 * Must be called after initContentSession
 * @param {boolean} forceSave
 */
function updateTimeSpent(store, forceSave = false) {
  /* Create aliases for logs */
  const summaryLog = store.state.core.logging.summary;
  const sessionLog = store.state.core.logging.session;

  /* Calculate new times based on how much time has passed since last save */
  const sessionTime = intervalTimer.getNewTimeElapsed() + sessionLog.time_spent;
  const summaryTime = summaryLog.id
    ? sessionTime + summaryLog.time_spent_before_current_session
    : 0;

  /* Update the logging state with new timing information */
  store.dispatch('SET_LOGGING_TIME', sessionTime, summaryTime, now());

  /* Determine if time threshold has been met */
  const timeThresholdMet =
    sessionLog.time_spent - sessionLog.total_time_at_last_save >= timeThreshold;

  /* Save models if needed */
  if (forceSave || timeThresholdMet) {
    saveLogs(store);
  }
}

/**
 * Start interval timer and set start time
 * @param {int} interval
 */
function startTrackingProgress(store, interval = intervalTime) {
  intervalTimer.startTimer(interval, () => {
    updateTimeSpent(store, false);
  });
}

/**
 * Action inhibition check
 *
 * This generator function produces checks that help determine whether the
 * asynchronous outcomes should still be run based on whether the user is
 * still on the same page as when the action was first triggered.
 */
function samePageCheckGenerator(store) {
  const pageId = store.state.core.pageSessionId;
  return () => store.state.core.pageSessionId === pageId;
}

/**
 * Stop interval timer and update latest times
 * Must be called after startTrackingProgress
 */
function stopTrackingProgress(store) {
  intervalTimer.stopTimer();
  updateTimeSpent(store, true);
}

function saveMasteryLog(store) {
  const masteryLogModel = MasteryLogResource.getModel(store.state.core.logging.mastery.id);
  return masteryLogModel.save(_masteryLogModel(store));
}

function saveAndStoreMasteryLog(store) {
  return saveMasteryLog(store).only(samePageCheckGenerator(store), newMasteryLog => {
    store.dispatch('SET_LOGGING_MASTERY_STATE', newMasteryLog);
  });
}

function setMasteryLogComplete(store, completetime) {
  store.dispatch('SET_LOGGING_MASTERY_COMPLETE', completetime);
}

function createMasteryLog(store, masteryLevel, masteryCriterion) {
  const masteryLogModel = MasteryLogResource.createModel({
    id: null,
    user: store.state.core.session.user_id,
    summarylog: store.state.core.logging.summary.id,
    start_timestamp: now(),
    completion_timestamp: null,
    end_timestamp: null,
    mastery_level: masteryLevel,
    complete: false,
    responsehistory: [],
    pastattempts: [],
    totalattempts: 0,
    mastery_criterion: masteryCriterion,
  });
  // Preemptively set attributes
  store.dispatch('SET_LOGGING_MASTERY_STATE', masteryLogModel.attributes);
  // Save to the server
  return masteryLogModel
    .save(masteryLogModel.attributes)
    .only(samePageCheckGenerator(store), newMasteryLog => {
      // Update store in case an id has been set.
      store.dispatch('SET_LOGGING_MASTERY_STATE', newMasteryLog);
    });
}

function createDummyMasteryLog(store) {
  /*
  Create a client side masterylog for anonymous user for tracking attempt-progress.
  This masterylog will never be saved in the database.
  */
  const masteryLogModel = MasteryLogResource.createModel({
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
  });
  store.dispatch('SET_LOGGING_MASTERY_STATE', masteryLogModel.attributes);
}

function saveAttemptLog(store) {
  const attemptLogModel = AttemptLogResource.findModel({
    item: store.state.core.logging.attempt.item,
  });
  if (attemptLogModel) {
    return attemptLogModel.save(_attemptLogModel(store));
  }
  return ConditionalPromise.resolve();
}

function saveAndStoreAttemptLog(store) {
  const attemptLogId = store.state.core.logging.attempt.id;
  const attemptLogItem = store.state.core.logging.attempt.item;
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
    !attemptLogId && attemptLogItem === store.state.core.logging.attempt.item;
  return saveAttemptLog(store).only(sameItemAndNoLogIdCheck, newAttemptLog => {
    // mainly we want to set the attemplot id, so we can PATCH subsequent save on this attemptLog
    store.dispatch('SET_LOGGING_ATTEMPT_STATE', _attemptLoggingState(newAttemptLog));
  });
}

function createAttemptLog(store, itemId) {
  const user = isUserLoggedIn(store.state) ? currentUserId(store.state) : null;
  const attemptLogModel = AttemptLogResource.createModel({
    id: null,
    user,
    masterylog: store.state.core.logging.mastery.id || null,
    sessionlog: store.state.core.logging.session.id,
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
  store.dispatch('SET_LOGGING_ATTEMPT_STATE', attemptLogModel.attributes);
}

const interactionHistoryProperties = ['type', 'correct', 'answer', 'timestamp'];

function updateAttemptLogInteractionHistory(store, interaction) {
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
  store.dispatch('UPDATE_LOGGING_ATTEMPT_INTERACTION_HISTORY', interaction);
  // Also update end timestamp on Mastery model.
  store.dispatch('UPDATE_LOGGING_MASTERY', now());
}

/**
 * Initialize assessment mastery log
 */
function initMasteryLog(store, masterySpacingTime, masteryCriterion) {
  if (!store.state.core.logging.mastery.id) {
    // id has not been set on the masterylog state, so this is undefined.
    // Either way, we need to create a new masterylog, with a masterylevel of 1!
    return createMasteryLog(store, 1, masteryCriterion);
  } else if (
    store.state.core.logging.mastery.complete &&
    now() - new Date(store.state.core.logging.mastery.completion_timestamp) > masterySpacingTime
  ) {
    // The most recent masterylog is complete, and they completed it more than
    // masterySpacingTime time ago!
    // This means we need to level the user up.
    return createMasteryLog(
      store,
      store.state.core.logging.mastery.mastery_level + 1,
      masteryCriterion
    );
  }
  return Promise.resolve();
}

function updateMasteryAttemptState(
  store,
  { currentTime, correct, complete, firstAttempt, hinted, answerState, simpleAnswer, error }
) {
  store.dispatch('UPDATE_LOGGING_MASTERY', currentTime, correct, firstAttempt, hinted, error);
  store.dispatch('UPDATE_LOGGING_ATTEMPT', {
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

function createSnackbar(store, snackbarOptions) {
  store.dispatch('CORE_CREATE_SNACKBAR', snackbarOptions);
}
function clearSnackbar(store) {
  store.dispatch('CORE_CLEAR_SNACKBAR');
}

export {
  handleError,
  handleApiError,
  blockDoubleClicks,
  kolibriLogin,
  kolibriLogout,
  getCurrentSession,
  getFacilities,
  getFacilityConfig,
  initContentSession,
  setChannelInfo,
  startTrackingProgress,
  stopTrackingProgress,
  updateTimeSpent,
  updateProgress,
  updateExerciseProgress,
  saveLogs,
  samePageCheckGenerator,
  initMasteryLog,
  saveMasteryLog,
  saveAndStoreMasteryLog,
  setMasteryLogComplete,
  createDummyMasteryLog,
  createAttemptLog,
  saveAttemptLog,
  saveAndStoreAttemptLog,
  updateMasteryAttemptState,
  updateAttemptLogInteractionHistory,
  fetchPoints,
  createSnackbar,
  clearSnackbar,
};
