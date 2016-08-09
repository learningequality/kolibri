const Kolibri = require('kolibri');
const Resources = Kolibri.resources.ContentNodeResource;
const ContentSessionLogResource = Kolibri.resources.ContentSessionLogResource;
const ContentSummaryLogResource = Kolibri.resources.ContentSummaryLogResource;
const constants = require('./state/constants');
const PageNames = constants.PageNames;
const intervalTimer = require('core-timer');

const intervalTime = 5000;
const progressThreshold = 0.2;
// const displayProgressThreshold = 0.1;
const timeThreshold = 30;


/**
 * Vuex State Mappers
 *
 * The methods below help map data from
 * the API to state in the Vuex store
 */


/**
 * Vuex State Mappers
 *
 * The methods below help map data from
 * the API to state in the Vuex store
 */

function _crumbState(ancestors) {
  // skip the root node
  return ancestors.slice(1).map(ancestor => ({
    id: ancestor.pk,
    title: ancestor.title,
  }));
}


function _topicState(data) {
  const state = {
    id: data.pk,
    title: data.title,
    description: data.description,
    breadcrumbs: _crumbState(data.ancestors),
  };
  return state;
}


function _contentState(data) {
  const state = {
    id: data.pk,
    title: data.title,
    kind: data.kind,
    description: data.description,
    thumbnail: data.thumbnail,
    available: data.available,
    files: data.files,
    content_id: data.content_id,
    progress: data.progress ? data.progress : 'unstarted',
    breadcrumbs: _crumbState(data.ancestors),
  };
  return state;
}


function _collectionState(data) {
  const topics = data
    .filter((item) => item.kind === 'topic')
    .map((item) => _topicState(item));
  const contents = data
    .filter((item) => item.kind !== 'topic')
    .map((item) => _contentState(item));
  return { topics, contents };
}

function _contentSummaryLoggingState(data) {
  const state = {
    id: (data.pk) ? data.pk : null,
    pending_create: false,
    start_timestamp: data.start_timestamp,
    completion_timestamp: data.completion_timestamp,
    end_timestamp: data.end_timestamp,
    progress: data.progress,
    time_spent: data.time_spent,
    extra_fields: data.extra_fields,
    time_spent_before_current_session: data.time_spent,
  };
  return state;
}

function _contentSessionLoggingState(data) {
  const state = {
    id: (data.pk) ? data.pk : null,
    pending_create: false,
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
  const sessionInProgress = store.state.pageState.logging.summary.id;
  const summaryLog = store.state.pageState.logging.summary;

  const mapping = {
    content_id: store.state.pageState.content.content_id,
    channel_id: store.state.core.session.channel_id,
    user: store.state.core.session.user_id,
    start_timestamp: (sessionInProgress) ? summaryLog.start_timestamp : new Date(),
    end_timestamp: (sessionInProgress) ? summaryLog.end_timestamp : null,
    completion_timestamp: (sessionInProgress) ? summaryLog.completion_timestamp : null,
    progress: (sessionInProgress) ? summaryLog.progress : 0,
    time_spent: (sessionInProgress) ? summaryLog.time_spent : 0,
    kind: store.state.pageState.content.kind,
    extra_fields: (sessionInProgress) ? summaryLog.extra_fields : '{}',
  };
  return mapping;
}

function _contentSessionModel(store) {
  const sessionLog = store.state.pageState.logging.session;
  const mapping = {
    content_id: store.state.pageState.content.content_id,
    channel_id: store.state.core.session.channel_id,
    user: store.state.core.session.user_id,
    start_timestamp: (sessionLog) ? sessionLog.start_timestamp : new Date(),
    end_timestamp: (sessionLog) ? sessionLog.end_timestamp : null,
    time_spent: (sessionLog) ? sessionLog.time_spent : 0,
    progress: (sessionLog) ? sessionLog.progress : 0,
    kind: store.state.pageState.content.kind,
    extra_fields: (sessionLog) ? sessionLog.extra_fields : '{}',
  };
  return mapping;
}

/**
 * Actions
 *
 * These methods are used to update client-side state
 */

function showExploreTopic(store, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_ROOT);

  const attributesPromise = Resources.getModel(id).fetch();
  const childrenPromise = Resources.getCollection({ parent: id }).fetch();

  Promise.all([attributesPromise, childrenPromise])
    .then(([attributes, children]) => {
      const pageState = { id };
      pageState.topic = _topicState(attributes);
      const collection = _collectionState(children);
      pageState.subtopics = collection.topics;
      pageState.contents = collection.contents;
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
    })
    .catch((error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}


function showExploreContent(store, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_CONTENT);

  Resources.getModel(id).fetch()
    .then((attributes) => {
      const pageState = {
        content: _contentState(attributes),
        logging: { summary: { progress: 0 } },
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
    })
    .catch((error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}


function showLearnRoot(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.LEARN_ROOT);

  Resources.getCollection({ recommendations: '' }).fetch()
    .then((recommendations) => {
      const pageState = { recommendations: recommendations.map(_contentState) };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
    })
    .catch((error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}


function showLearnContent(store, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.LEARN_CONTENT);

  const attributesPromise = Resources.getModel(id).fetch();
  const recommendedPromise = Resources.getCollection({ recommendations_for: id }).fetch();

  Promise.all([attributesPromise, recommendedPromise])
    .then(([attributes, recommended]) => {
      const pageState = {
        content: _contentState(attributes),
        recommended: recommended.map(_contentState),
        logging: { summary: { progress: 0 } },
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
    })
    .catch((error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}


function triggerSearch(store, searchTerm) {
  if (!searchTerm) {
    const searchState = {
      searchTerm,
      topics: [],
      contents: [],
    };
    store.dispatch('SET_SEARCH_STATE', searchState);
    return;
  }

  store.dispatch('SET_SEARCH_LOADING');

  const contentCollection = Resources.getPagedCollection({ search: searchTerm });
  const searchResultsPromise = contentCollection.fetch();

  searchResultsPromise.then((results) => {
    const searchState = { searchTerm };
    const collection = _collectionState(results);
    searchState.topics = collection.topics;
    searchState.contents = collection.contents;
    store.dispatch('SET_SEARCH_STATE', searchState);
  })
  .catch((error) => {
    // TODO - how to parse and format?
    store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
  });
}


function toggleSearch(store) {
  store.dispatch('TOGGLE_SEARCH');
}


function showScratchpad(store) {
  store.dispatch('SET_PAGE_NAME', PageNames.SCRATCHPAD);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
}

/**
 * Create models to store logging information
 * To be called on page load for content renderers
 */
function initContentSession(store) {
  /* TODO: REMOVE THIS LATER */
  store.dispatch('CORE_SET_SESSION', {
    user_id: 1,
    channel_id: '7199dde695db4ee4ab392222d5af1e5c',
  });

  /* Fetch collection matching content and user */
  const summaryCollection = ContentSummaryLogResource.getCollection({
    content_id: store.state.pageState.content.content_id,
    user: store.state.core.user_id,
  });
  summaryCollection.fetch().then(summary => {
    /* If a summary model exists, map that to the state. Otherwise use default mapping */
    const summaryState = (summary.length > 0) ? summary[0] : _contentSummaryModel(store);

    /* Set logging state */
    const loggingState = {
      summary: _contentSummaryLoggingState(summaryState),
      session: _contentSessionLoggingState(_contentSessionModel(store)),
    };
    store.dispatch('SET_LOGGING_STATE', loggingState);
  });
}

/**
 * Update the progress percentage
 * To be called periodically by content renderers on interval or on pause
 * Must be called after initContentSession
 * @param {float} progressPercent
 */
function updateProgress(store, progressPercent) {
  /* Create aliases for logs */
  const summaryLog = store.state.pageState.logging.summary;
  const sessionLog = store.state.pageState.logging.session;

  /* Store original value to check if 100% reached this iteration */
  const originalProgress = summaryLog.progress;

  /* Calculate progress based on progressPercent */
  const summaryProgress = Math.min(1, progressPercent + summaryLog.progress);
  const sessionProgress = sessionLog.progress + progressPercent;

  /* Update the logging state with new progress information */
  store.dispatch('SET_LOGGING_PROGRESS', sessionProgress, summaryProgress);

  /* Mark completion time if 100% progress reached */
  if (originalProgress < 1 && summaryProgress === 1) {
    store.dispatch('SET_LOGGING_COMPLETION_TIME', new Date());
    this.updateTimerCallback(true);
  }
}

/**
 * Update the total time spent and end time stamps
 * To be called periodically by interval timer
 * Must be called after initContentSession
 */
function updateTimeSpent(store) {
  /* Create aliases for logs */
  const summaryLog = store.state.pageState.logging.summary;
  const sessionLog = store.state.pageState.logging.session;

  /* Calculate new times based on how much time has passed since last save */
  const sessionTime = intervalTimer.getTimeElapsed() + sessionLog.total_time_at_last_save;
  const summaryTime = sessionTime + summaryLog.time_spent_before_current_session;

  /* Update the logging state with new timing information */
  store.dispatch('SET_LOGGING_TIME', sessionTime, summaryTime, new Date());
}

/**
 * Update logging information and decide whether or not to save
 * @param {boolean} forceSave
 * To be called periodically by interval timer and on pause
 * Must be called after initContentSession
 */
function updateTimerCallback(store, forceSave = false) {
  /* Create aliases for logs */
  const sessionLog = store.state.pageState.logging.session;
  const summaryLog = store.state.pageState.logging.summary;

  /* Update timing values */
  this.updateTimeSpent();

  /* Calculate whether progress or time thresholds have been met */
  const progressThresholdMet = sessionLog.progress -
    sessionLog.progress_at_last_update >= progressThreshold;
  const timeThresholdMet = sessionLog.time_spent -
    sessionLog.total_time_at_last_update >= timeThreshold;

  /* Save if forced to save or a threshold has been met */
  if (forceSave || timeThresholdMet || progressThresholdMet) {
    this.saveLogs();
  }
}

/**
 * Do a PATCH to update existing logging models
 * Must be called after initContentSession
 */
function saveLogs(store) {
  const summaryLog = store.state.pageState.logging.summary;
  const sessionLog = store.state.pageState.logging.session;
  const createSummary = !summaryLog.id;
  const createSession = !sessionLog.id;

  /* Only continue if session and summary models are not being created */
  if (!sessionLog.pending_create && !summaryLog.pending_create) {
    /* Get session model to update with new values */
    const sessionModel = (createSession) ?
      ContentSessionLogResource.createModel() :
      ContentSessionLogResource.getModel(sessionLog.id);
    const sessionPromise = sessionModel.save(_contentSessionModel(store));

    /* Get summary model to update with new values */
    const summaryModel = (createSummary) ?
      ContentSummaryLogResource.createModel() :
      ContentSummaryLogResource.getModel(summaryLog.id);
    const summaryPromise = summaryModel.save(_contentSummaryModel(store));

    /* Update pending_create values on logging state */
    store.dispatch('SET_LOGGING_PENDING', createSummary, createSession);

    /* Perform save on summary and session models */
    Promise.all([summaryPromise, sessionPromise]).then((models) => {
      console.log('Updated!:', models);

      /* Update logging state with returned values */
      const postSaveState = {
        summary: _contentSummaryLoggingState(models[0]),
        session: _contentSessionLoggingState(models[1]),
      };
      store.dispatch('SET_LOGGING_STATE', postSaveState);
    }).catch((error) => {
      store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
    });
  }
}

/**
 * Start interval timer and set start time
 * @param {int} interval
 * Must be called after initContentSession
 */
function startTrackingProgress(store, interval = intervalTime) {
  // Start timer
  intervalTimer.startTimer(interval, this.updateTimerCallback);
}

/**
 * Stop interval timer and update latest times
 * Must be called after startTrackingProgress
 */
function stopTrackingProgress(store) {
  // Stop timer and update progress
  intervalTimer.stopTimer();
  this.updateTimerCallback(true);
}

module.exports = {
  showExploreTopic,
  showExploreContent,
  showLearnRoot,
  showLearnContent,
  showScratchpad,
  triggerSearch,
  toggleSearch,
  initContentSession,
  startTrackingProgress,
  stopTrackingProgress,
  updateTimeSpent,
  updateProgress,
  saveLogs,
  updateTimerCallback,
};
