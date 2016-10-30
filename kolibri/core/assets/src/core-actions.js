const intervalTime = 5000; // Frequency at which time logging is updated
const progressThreshold = 0.1; // Update logs if user has reached 20% more progress
const timeThreshold = 30; // Update logs if 30 seconds have passed since last update
const intervalTimer = require('./timer');
const UserKinds = require('./constants').UserKinds;
const MasteryLoggingMap = require('./constants').MasteryLoggingMap;
const AttemptLoggingMap = require('./constants').AttemptLoggingMap;

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
  const mapping = {
    start_timestamp: sessionLog.start_timestamp,
    end_timestamp: sessionLog.end_timestamp,
    time_spent: sessionLog.time_spent,
    progress: sessionLog.progress,
    extra_fields: sessionLog.extra_fields,
  };
  if (store.state.core.session.kind[0] !== UserKinds.SUPERUSER) {
    mapping.user = store.state.core.session.user_id;
  }
  return mapping;
}

function _sessionState(data) {
  const state = {
    id: data.id,
    username: data.username,
    full_name: data.full_name,
    user_id: data.user_id,
    facility_id: data.facility_id,
    kind: data.kind,
    error: data.error,
  };
  return state;
}

function _masteryLogModel(store) {
  const mapping = {};
  const masteryLog = store.state.core.logging.mastery;
  Object.keys(MasteryLoggingMap).forEach((key) => {
    mapping[MasteryLoggingMap[key]] = masteryLog[key];
  });
  mapping.summarylog = store.state.core.logging.summary.id;
  return mapping;
}

const attemptLoggingJSONifyKeys = {
  answer: true,
  interaction_history: true,
};

function _attemptLoggingState(data) {
  const state = {};
  Object.keys(AttemptLoggingMap).forEach((key) => {
    if (attemptLoggingJSONifyKeys[key]) {
      state[key] = JSON.parse(data[AttemptLoggingMap[key]]);
    } else {
      state[key] = data[AttemptLoggingMap[key]];
    }
  });
  return state;
}

function _attemptLogModel(store) {
  const mapping = {};
  const attemptLog = store.state.core.logging.attempt;
  Object.keys(AttemptLoggingMap).forEach((key) => {
    if (attemptLoggingJSONifyKeys[key]) {
      mapping[AttemptLoggingMap[key]] = JSON.stringify(attemptLog[key]);
    } else {
      mapping[AttemptLoggingMap[key]] = attemptLog[key];
    }
  });
  mapping.masterylog = store.state.core.logging.mastery.id;
  return mapping;
}

/**
 * Actions
 *
 * These methods are used to update client-side state
 */


function handleError(store, errorString) {
  store.dispatch('CORE_SET_ERROR', errorString);
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_TITLE', 'Error');
}

function handleApiError(store, errorObject) {
  handleError(store, JSON.stringify(errorObject, null, '\t'));
}

function kolibriLogin(store, Kolibri, sessionPayload) {
  const SessionResource = Kolibri.resources.SessionResource;
  const sessionModel = SessionResource.createModel(sessionPayload);
  const sessionPromise = sessionModel.save(sessionPayload);
  sessionPromise.then((session) => {
    store.dispatch('CORE_SET_SESSION', _sessionState(session));
    /* Very hacky solution to redirect an admin or superuser to Manage tab on login*/
    if (session.kind[0] === UserKinds.SUPERUSER || session.kind[0] === UserKinds.ADMIN) {
      const manageURL = Kolibri.urls['kolibri:managementplugin:management']();
      window.location.href = window.location.origin + manageURL;
    } else {
      Kolibri.emit('refresh');
    }
    Kolibri.resources.clearCaches();
  }).catch(error => {
    if (error.status.code === 401) {
      store.dispatch('CORE_SET_LOGIN_ERROR', 401);
    } else {
      handleApiError(store, error);
    }
  });
}

function kolibriLogout(store, Kolibri) {
  const SessionResource = Kolibri.resources.SessionResource;
  const id = 'current';
  const sessionModel = SessionResource.getModel(id);
  const logoutPromise = sessionModel.delete();
  logoutPromise.then((response) => {
    store.dispatch('CORE_CLEAR_SESSION');
    /* Very hacky solution to redirect a user back to Learn tab on logout*/
    window.location.href = window.location.origin;
    Kolibri.resources.clearCaches();
  }).catch(error => { handleApiError(store, error); });
}

function currentLoggedInUser(store, Kolibri) {
  const SessionResource = Kolibri.resources.SessionResource;
  const id = 'current';
  const sessionModel = SessionResource.getModel(id);
  const sessionPromise = sessionModel.fetch({});
  sessionPromise.then((session) => {
    store.dispatch('CORE_SET_SESSION', _sessionState(session));
  }).catch(error => { handleApiError(store, error); });
}

function showLoginModal(store, bool) {
  store.dispatch('CORE_SET_LOGIN_MODAL_VISIBLE', true);
  store.dispatch('CORE_SET_LOGIN_ERROR', null);
}

function cancelLoginModal(store, bool) {
  store.dispatch('CORE_SET_LOGIN_MODAL_VISIBLE', false);
  store.dispatch('CORE_SET_LOGIN_ERROR', null);
}


/**
 * Create models to store logging information
 * To be called on page load for content renderers
 */
function initContentSession(store, Kolibri, channelId, contentId, contentKind) {
  const ContentSessionLogResource = Kolibri.resources.ContentSessionLogResource;
  const ContentSummaryLogResource = Kolibri.resources.ContentSummaryLogResource;

  // Always clear the logging state when we init the content session,
  // to avoid state pollution.
  store.dispatch('SET_EMPTY_LOGGING_STATE');

  /* Create summary log iff user exists */
  if (store.state.core.session.user_id &&
    store.state.core.session.kind[0] !== UserKinds.SUPERUSER) {
     /* Fetch collection matching content and user */
    const summaryCollection = ContentSummaryLogResource.getCollection({
      content_id: contentId,
      user: store.state.core.session.user_id,
    });
    summaryCollection.fetch({}, true).then(summary => {
      /* If a summary model exists, map that to the state */
      if (summary.length > 0) {
        store.dispatch('SET_LOGGING_SUMMARY_STATE', _contentSummaryLoggingState(summary[0]));
        if (summary[0].currentmasterylog) {
          // If a mastery model has been sent along with the summary log payload,
          // then bootstrap that data into the MasteryLog resource. Cheeky!
          const masteryModel = Kolibri.resources.MasteryLog.createModel(
            summary[0].currentmasterylog);
          masteryModel.synced = true;

          store.dispatch('SET_LOGGING_MASTERY_STATE',
            summary[0].currentmasterylog);
        }
      } else {
        /* If a summary model does not exist, create default state */
        store.dispatch('SET_LOGGING_SUMMARY_STATE', _contentSummaryLoggingState({
          pk: null,
          start_timestamp: new Date(),
          completion_timestamp: null,
          end_timestamp: new Date(),
          progress: 0,
          time_spent: 0,
          extra_fields: '{}',
          time_spent_before_current_session: 0,
          progress_before_current_session: 0,
        }));

        const summaryData = Object.assign({
          channel_id: channelId,
          content_id: contentId,
          kind: contentKind,
        }, _contentSummaryModel(store));

        /* Save a new summary model and set id on state */
        const summaryModel = ContentSummaryLogResource.createModel(summaryData);
        summaryModel.save().then((newSummary) => {
          store.dispatch('SET_LOGGING_SUMMARY_ID', newSummary.pk);
        });
      }
    });
  }

  /* Set session log state to default */
  store.dispatch('SET_LOGGING_SESSION_STATE', _contentSessionLoggingState({
    pk: null,
    start_timestamp: new Date(),
    end_timestamp: new Date(),
    time_spent: 0,
    progress: 0,
    extra_fields: '{}',
  }));

  const sessionData = Object.assign({
    channel_id: channelId,
    content_id: contentId,
    kind: contentKind,
  }, _contentSessionModel(store));

  if (store.state.core.session.kind[0] === UserKinds.SUPERUSER) {
    // treat deviceOwner as anonymous user.
    sessionData.user = null;
  }

  /* Save a new session model and set id on state */
  const sessionModel = ContentSessionLogResource.createModel(sessionData);
  sessionModel.save().then((newSession) => {
    store.dispatch('SET_LOGGING_SESSION_ID', newSession.pk);
  });
}


/**
 * Do a PATCH to update existing logging models
 * Must be called after initContentSession
 */
function saveLogs(store, Kolibri) {
  const ContentSessionLogResource = Kolibri.resources.ContentSessionLogResource;
  const ContentSummaryLogResource = Kolibri.resources.ContentSummaryLogResource;
  /* Create aliases for logs */
  const summaryLog = store.state.core.logging.summary;
  const sessionLog = store.state.core.logging.session;

  /* Reset values used for threshold checking */
  store.dispatch('SET_LOGGING_THRESHOLD_CHECKS', sessionLog.progress, sessionLog.time_spent);

  /* If a session model exists, save it with updated values */
  if (sessionLog.id) {
    const sessionModel = ContentSessionLogResource.getModel(sessionLog.id);
    sessionModel.save(_contentSessionModel(store)).then((data) => {
      /* PLACEHOLDER */
    }).catch(error => { handleApiError(store, error); });
  }

  /* If a summary model exists, save it with updated values */
  if (summaryLog.id) {
    const summaryModel = ContentSummaryLogResource.getModel(summaryLog.id);
    summaryModel.save(_contentSummaryModel(store)).then((data) => {
      /* PLACEHOLDER */
    }).catch(error => { handleApiError(store, error); });
  }
}


/**
 * Update the progress percentage
 * To be called periodically by content renderers on interval or on pause
 * Must be called after initContentSession
 * @param {float} progressPercent
 * @param {boolean} forceSave
 */
function updateProgress(store, Kolibri, progressPercent, forceSave = false) {
  /* Create aliases for logs */
  const summaryLog = store.state.core.logging.summary;
  const sessionLog = store.state.core.logging.session;

  /* Store original value to check if 100% reached this iteration */
  const originalProgress = summaryLog.progress;

  /* Calculate progress based on progressPercent */
  const sessionProgress = sessionLog.progress + progressPercent;
  const summaryProgress = (summaryLog.id) ?
    Math.min(1, summaryLog.progress_before_current_session + sessionProgress) : 0;

  /* Update the logging state with new progress information */
  store.dispatch('SET_LOGGING_PROGRESS', sessionProgress, summaryProgress);

  /* Determine if progress threshold has been met */
  const progressThresholdMet = sessionProgress -
    sessionLog.progress_at_last_save >= progressThreshold;

  /* Mark completion time if 100% progress reached */
  const completedContent = originalProgress < 1 && summaryProgress === 1;
  if (completedContent) {
    store.dispatch('SET_LOGGING_COMPLETION_TIME', new Date());
  }

  /* Save models if needed */
  if (forceSave || completedContent || progressThresholdMet) {
    saveLogs(store, Kolibri);
  }
}


/**
 * Update the total time spent and end time stamps
 * To be called periodically by interval timer
 * Must be called after initContentSession
 * @param {boolean} forceSave
 */
function updateTimeSpent(store, Kolibri, forceSave = false) {
  /* Create aliases for logs */
  const summaryLog = store.state.core.logging.summary;
  const sessionLog = store.state.core.logging.session;

  /* Calculate new times based on how much time has passed since last save */
  const sessionTime = intervalTimer.getNewTimeElapsed() + sessionLog.time_spent;
  const summaryTime = (summaryLog.id) ?
    sessionTime + summaryLog.time_spent_before_current_session : 0;

  /* Update the logging state with new timing information */
  store.dispatch('SET_LOGGING_TIME', sessionTime, summaryTime, new Date());

  /* Determine if time threshold has been met */
  const timeThresholdMet = sessionLog.time_spent -
    sessionLog.total_time_at_last_save >= timeThreshold;

  /* Save models if needed */
  if (forceSave || timeThresholdMet) {
    saveLogs(store, Kolibri);
  }
}


/**
 * Start interval timer and set start time
 * @param {int} interval
 */
function startTrackingProgress(store, Kolibri, interval = intervalTime) {
  intervalTimer.startTimer(interval, () => {
    updateTimeSpent(store, Kolibri, false);
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
function stopTrackingProgress(store, Kolibri) {
  intervalTimer.stopTimer();
  updateTimeSpent(store, Kolibri, true);
}

function saveMasteryLog(store, Kolibri) {
  const masteryLogModel = Kolibri.resources.MasteryLog.getModel(
    store.state.core.logging.mastery.id);
  masteryLogModel.save(_masteryLogModel(store)).only(
    samePageCheckGenerator(store),
    (newMasteryLog) => {
      // Update store in case an id has been set.
      store.dispatch('SET_LOGGING_MASTERY_STATE', newMasteryLog);
    }
  );
}

function setMasteryLogComplete(store, completetime) {
  store.dispatch('SET_LOGGING_MASTERY_COMPLETE', completetime);
}

function createMasteryLog(store, Kolibri, masteryLevel, masteryCriterion) {
  const masteryLogModel = Kolibri.resources.MasteryLog.createModel({
    id: null,
    summarylog: store.state.core.logging.summary.id,
    start_timestamp: new Date(),
    completion_timestamp: null,
    end_timestamp: null,
    mastery_level: masteryLevel,
    complete: false,
    responsehistory: [],
    pastattempts: [],
    totalattempts: 0,
    mastery_criterion: masteryCriterion,
  });
  masteryLogModel.save(masteryLogModel.attributes).only(
    samePageCheckGenerator(store),
    (newMasteryLog) => {
      // Update store in case an id has been set.
      store.dispatch('SET_LOGGING_MASTERY_STATE', newMasteryLog);
    }
  );
}

function createDummyMasteryLog(store, Kolibri) {
  /*
  Create a client side masterylog for anonymous user for tracking attempt-progress.
  This masterylog will never be saved in the database.
  */
  const masteryLogModel = Kolibri.resources.MasteryLog.createModel({
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

function saveAttemptLog(store, Kolibri) {
  const attemptLogModel = Kolibri.resources.AttemptLog.getModel(
    store.state.core.logging.attempt.id);
  const promise = attemptLogModel.save(_attemptLogModel(store));
  promise.then((newAttemptLog) => {
    // mainly we want to set the attemplot id, so we can PATCH subsequent save on this attemptLog
    store.dispatch('SET_LOGGING_ATTEMPT_STATE', _attemptLoggingState(newAttemptLog));
  });
  return promise;
}

function createAttemptLog(store, Kolibri, itemId) {
  const attemptLogModel = Kolibri.resources.AttemptLog.createModel({
    id: null,
    masterylog: store.state.core.logging.mastery.id || null,
    sessionlog: store.state.core.logging.session.id,
    start_timestamp: new Date(),
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

function updateAttemptLogInteractionHistory(store, interaction) {
  store.dispatch('UPDATE_LOGGING_ATTEMPT_INTERACTION_HISTORY', interaction);
}

/**
 * Initialize assessment mastery log
 */
function initMasteryLog(store, Kolibri, masterySpacingTime, masteryCriterion) {
  if (!store.state.core.logging.mastery.id) {
    // id has not been set on the masterylog state, so this is undefined.
    // Either way, we need to create a new masterylog, with a masterylevel of 1!
    createMasteryLog(store, Kolibri, 1, masteryCriterion);
  } else if (store.state.core.logging.mastery.complete &&
    ((new Date() - new Date(store.state.core.logging.mastery.completion_timestamp)) >
      masterySpacingTime)) {
    // The most recent masterylog is complete, and they completed it more than
    // masterySpacingTime time ago!
    // This means we need to level the user up.
    createMasteryLog(
      store, Kolibri, store.state.core.logging.mastery.mastery_level + 1, masteryCriterion);
  }
}

function updateMasteryAttemptState(store, currentTime, correct, complete, firstAttempt, hinted) {
  store.dispatch('UPDATE_LOGGING_MASTERY', currentTime, correct, firstAttempt, hinted);
  store.dispatch('UPDATE_LOGGING_ATTEMPT', currentTime, correct, complete, hinted);
}


module.exports = {
  handleError,
  handleApiError,
  kolibriLogin,
  kolibriLogout,
  currentLoggedInUser,
  showLoginModal,
  cancelLoginModal,
  initContentSession,
  startTrackingProgress,
  stopTrackingProgress,
  updateTimeSpent,
  updateProgress,
  saveLogs,
  samePageCheckGenerator,
  initMasteryLog,
  saveMasteryLog,
  setMasteryLogComplete,
  createDummyMasteryLog,
  createAttemptLog,
  saveAttemptLog,
  updateMasteryAttemptState,
  updateAttemptLogInteractionHistory,
};
