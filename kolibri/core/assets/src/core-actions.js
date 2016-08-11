const intervalTime = 5000; // Frequency at which time logging is updated
const progressThreshold = 0.2; // Update logs if user has reached 20% more progress
const timeThreshold = 30; // Update logs if 30 seconds have passed since last update
const intervalTimer = require('./timer');

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
    user: store.state.core.session.user_id,
    start_timestamp: sessionLog.start_timestamp,
    end_timestamp: sessionLog.end_timestamp,
    time_spent: sessionLog.time_spent,
    progress: sessionLog.progress,
    extra_fields: sessionLog.extra_fields,
  };
  return mapping;
}


function kolibriLogin(store, Kolibri, sessionPayload) {
  const SessionResource = Kolibri.resources.SessionResource;
  const sessionModel = SessionResource.createModel(sessionPayload);
  const sessionPromise = sessionModel.save(sessionPayload);
  const UserKinds = require('./constants').UserKinds;
  sessionPromise.then((session) => {
    store.dispatch('CORE_SET_SESSION', session);
    if (session.kind.includes(UserKinds.ADMIN) || session.kind === UserKinds.SUPERUSER) {
      store.dispatch('SET_ADMIN_STATUS', true);
    }
  }).catch((error) => {
    // hack to handle invalid credentials
    if (error.status.code === 401) {
      store.dispatch('HANDLE_WRONG_CREDS', { kind: 'ANONYMOUS', error: '401' });
    } else {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
    }
  });
}

function kolibriLogout(store, Kolibri) {
  const SessionResource = Kolibri.resources.SessionResource;
  const id = 'current';
  const sessionModel = SessionResource.getModel(id);
  const logoutPromise = sessionModel.delete(id);
  logoutPromise.then((response) => {
    store.dispatch('CORE_CLEAR_SESSION');
  }).catch((error) => {
    store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
  });
}

function currentLoggedInUser(store, Kolibri) {
  const SessionResource = Kolibri.resources.SessionResource;
  const id = 'current';
  const sessionModel = SessionResource.getModel(id);
  const sessionPromise = sessionModel.fetch();
  const UserKinds = require('./constants').UserKinds;
  sessionPromise.then((session) => {
    if (session.kind.includes(UserKinds.ADMIN) || session.kind === UserKinds.SUPERUSER) {
      store.dispatch('SET_ADMIN_STATUS', true);
    }
    store.dispatch('CORE_SET_SESSION', session);
  }).catch((error) => {
    store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
  });
}

function togglemodal(store, bool) {
  store.dispatch('SET_MODAL_STATE', bool);
  if (!bool) {
    // Clears the store to clear any error message from login modal
    store.dispatch('CORE_CLEAR_SESSION');
  }
}


/**
 * Create models to store logging information
 * To be called on page load for content renderers
 */
function initContentSession(store, Kolibri, channelId, contentId, contentKind) {
  const ContentSessionLogResource = Kolibri.resources.ContentSessionLogResource;
  const ContentSummaryLogResource = Kolibri.resources.ContentSummaryLogResource;

  /* Create summary log iff user exists */
  if (store.state.core.session.user_id) {
     /* Fetch collection matching content and user */
    const summaryCollection = ContentSummaryLogResource.getCollection({
      content_id: contentId,
      user: store.state.core.session.user_id,
    });
    summaryCollection.fetch().then(summary => {
      /* If a summary model exists, map that to the state */
      if (summary.length > 0) {
        store.dispatch('SET_LOGGING_SUMMARY_STATE', _contentSummaryLoggingState(summary[0]));
      } else {
        /* If a summary model does not exist, create default state */
        store.dispatch('SET_LOGGING_SUMMARY_STATE', _contentSummaryLoggingState({
          pk: null,
          start_timestamp: new Date(),
          completion_timestamp: null,
          end_timestamp: null,
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
    end_timestamp: null,
    time_spent: 0,
    progress: 0,
    extra_fields: '{}',
  }));

  const sessionData = Object.assign({
    channel_id: channelId,
    content_id: contentId,
    kind: contentKind,
  }, _contentSessionModel(store));

  /* Save a new session model and set id on state */
  const sessionModel = ContentSessionLogResource.createModel(sessionData);
  sessionModel.save().then((newSession) => {
    store.dispatch('SET_LOGGING_SESSION_ID', newSession.pk);
  });
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
    this.saveLogs(Kolibri);
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
    this.saveLogs(Kolibri);
  }
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

  /* If a session model exists, save it with updated values */
  if (sessionLog.id) {
    const sessionModel = ContentSessionLogResource.getModel(sessionLog.id);
    sessionModel.save(_contentSessionModel(store)).then((model) => {
      /* Reset values used for threshold checking */
      sessionLog.total_time_at_last_save = model.time_spent;
      sessionLog.progress_at_last_save = model.progress;
    }).catch((error) => {
      store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
    });
  }

  /* If a summary model exists, save it with updated values */
  if (summaryLog.id) {
    const summaryModel = ContentSummaryLogResource.getModel(summaryLog.id);
    summaryModel.save(_contentSummaryModel(store)).then((model) => {
      /* PLACEHOLDER */
    }).catch((error) => {
      store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
    });
  }
}


/**
 * Start interval timer and set start time
 * @param {int} interval
 */
function startTrackingProgress(store, Kolibri, interval = intervalTime) {
  const self = this;
  intervalTimer.startTimer(interval, () => {
    self.updateTimeSpent(Kolibri, false);
  });
}


/**
 * Stop interval timer and update latest times
 * Must be called after startTrackingProgress
 */
function stopTrackingProgress(store, Kolibri) {
  intervalTimer.stopTimer();
  this.updateTimeSpent(Kolibri, true);
}

module.exports = {
  kolibriLogin,
  kolibriLogout,
  currentLoggedInUser,
  togglemodal,
  initContentSession,
  startTrackingProgress,
  stopTrackingProgress,
  updateTimeSpent,
  updateProgress,
  saveLogs,
};
