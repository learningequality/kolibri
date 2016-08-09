const Kolibri = require('kolibri');
const Resources = Kolibri.resources.ContentNodeResource;
const constants = require('./state/constants');
const PageNames = constants.PageNames;
const intervalTimer = require('core-timer');
const ContentSessionLogResource = Kolibri.resources.ContentSessionLogResource;
const ContentSummaryLogResource = Kolibri.resources.ContentSummaryLogResource;

const intervalTime = 5000;
const progressThreshold = 0.2;
const displayProgressThreshold = 0.1;
const timeThreshold = 30;


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
    id: data.id,
    pending_save: data.id === null,
    start_timestamp: data.start_timestamp,
    completion_timestamp: data.completion_timestamp,
    end_timestamp: data.end_timestamp,
    progress: data.progress,
    time_spent: data.time_spent,
    extra_fields: data.extra_fields,
    time_spent_before_current_session: data.time_spent,
    progress_at_last_update: data.progress,
    display_progress: data.progress,
  };
  return state;
}

// function _contentSessionLoggingState(data) {
//   const state = {
//     id: data.id,
//     pending_save: false,
//     start_timestamp: data.start_timestamp,
//     end_timestamp: data.end_timestamp,
//     time_spent: data.time_spent,
//     extra_fields: data.extra_fields,
//     total_time_at_last_update: data.time_spent,
//     progress: data.progress,
//   };
//   return state;
// }

function _contentSummaryModel(store) {
  const summaryLog = store.state.pageState.logging.summary;
  const mapping = {
    content_id: store.state.pageState.content.content_id,
    channel_id: store.state.core.session.channel_id,
    user: store.state.core.session.user_id,
    start_timestamp: (summaryLog) ? summaryLog.start_timestamp : new Date(),
    end_timestamp: (summaryLog) ? summaryLog.end_timestamp : null,
    completion_timestamp: (summaryLog) ? summaryLog.completion_timestamp : null,
    progress: (summaryLog) ? summaryLog.progress : 0,
    time_spent: (summaryLog) ? summaryLog.time_spent : 0,
    kind: store.state.pageState.content.kind,
    extra_fields: (summaryLog) ? summaryLog.extra_fields : '{}',
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
 * Create models to store progress
 */
function initContentSession(store) {
  /* TODO: REMOVE THIS LATER */
  store.dispatch('CORE_SET_SESSION', {
    user_id: '1',
    channel_id: '7199dde695db4ee4ab392222d5af1e5c',
  });
  console.log('channel', store.state.core.session.channel_id);

  const summaryCollection = ContentSummaryLogResource.getCollection();
  summaryCollection.fetch({
    content_id: store.state.pageState.content.content_id,
    user: store.state.core.user_id,
  }).then(summary => {
    const createNewSummary = summary.length === 0;
    const sessionModel = ContentSessionLogResource.createModel(_contentSessionModel(store));
    console.log(sessionModel);
    // const sessionPromise = sessionModel.save(sessionModel.attributes);

    if (createNewSummary) {
      summary.push(ContentSummaryLogResource.createModel(_contentSummaryModel(store)));
    }
    const summaryModel = summary[0];
    const summaryPromise = (createNewSummary) ?
      summaryModel.save(summaryModel.attributes) :
      (resolve, reject) => {
        resolve(summaryModel.id);
      };

    Promise.all([summaryPromise]).then((logs) => {
      const loggingState = {
        summary: _contentSummaryLoggingState(logs[0].attributes),
        // session: _contentSessionLoggingState(logs[1].attributes),
      };
      store.dispatch('SET_LOGGING_STATE', loggingState);
      console.log(store.state.pageState.logging.summary.id);
    });
  });
}

function updateProgress(store, progressPercent) {
  const summaryLog = store.state.pageState.logging.summary;
  const sessionLog = store.state.pageState.logging.session;

  // Update summary progress
  sessionLog.progress += progressPercent;
  summaryLog.progress = Math.min(1, progressPercent + summaryLog.progress);

  if (summaryLog.progress >= summaryLog.display_progress / 100 + displayProgressThreshold) {
    summaryLog.display_progress = Math.floor(summaryLog.progress * 10) * 10;
  }

  // Update summary completion time if reached 100% progress
  if (summaryLog.progress === 1) {
    summaryLog.completion_timestamp = new Date();
  }
}

function updateTimeSpent(store) {
  const summaryLog = store.state.pageState.logging.summary;
  const sessionLog = store.state.pageState.logging.session;

  // Set last activity time
  summaryLog.end_timestamp = sessionLog.end_timestamp = new Date();

  // Set interaction total time
  sessionLog.time_spent = intervalTimer.getTimeElapsed()
    + sessionLog.total_time_at_last_update;

  // Update summary total time
  summaryLog.time_spent = sessionLog.time_spent
    + summaryLog.time_spent_before_current_session;
}

/**
 * Do a PATCH to update existing logging models
 * @param {boolean} forceSave
 */
function updateLogs(store, forceSave = false) {
  const summaryLog = store.state.pageState.logging.summary;
  const sessionLog = store.state.pageState.logging.session;

  this.updateProgress(0);
  this.updateTimeSpent();

  const progressThresholdMet = summaryLog.progress -
    summaryLog.progress_at_last_update >= progressThreshold;
  const timeThresholdMet = sessionLog.time_spent -
    sessionLog.total_time_at_last_update >= timeThreshold;
  const pendingSaves = sessionLog.pending_save || summaryLog.pending_save;

  if (forceSave || (!pendingSaves && (timeThresholdMet || progressThresholdMet))) {
    this.saveLogs();
  }
}

/**
 * Do a PATCH to update existing logging models
 * @param {boolean} forceSave
 */
function saveLogs(store) {
  const summaryLog = store.state.pageState.logging.summary;
  const sessionLog = store.state.pageState.logging.session;

  sessionLog.total_time_at_last_update = sessionLog.time_spent;
  summaryLog.progress_at_last_update = summaryLog.progress;
  console.log('********** UPDATING PROGRESS **********');
  summaryLog.pending_save = sessionLog.pending_save = true;
  /* TODO: REMOVE- temporary hack to test automatic saving on intervals */
  setTimeout(() => {
    summaryLog.pending_save = sessionLog.pending_save = false;
  }, 2000);

  // Save updated values
  // const interactionPromise =
    // this.ContentInteractionLogModel.save(store.state.pageState.logging.interaction);
  // const summaryPromise =
    // this.ContentSummaryLogModel.save(store.state.pageState.logging.summary);

  // Promise.all([summaryPromise, interactionPromise]).then((models) => {
  //   console.log('Summary:', models[0]);
  //   console.log('Interaction:', models[1]);
  // }).catch((error) => {
  //   store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
  // });
}

/**
 * Start interval timer and set start time
 * @param {int} interval
 */
function startTrackingProgress(store, interval = intervalTime) {
  // Start timer
  intervalTimer.startTimer(interval, this.updateLogs);
}

/**
 * Stop interval timer and update latest times
 */
function stopTrackingProgress(store) {
  // Stop timer and update progress
  intervalTimer.stopTimer();
  this.updateLogs(true);
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
  updateLogs,
};
