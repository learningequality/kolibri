const Kolibri = require('kolibri');
const Resources = Kolibri.resources.ContentNodeResource;
const constants = require('./state/constants');
const PageNames = constants.PageNames;
const intervalTimer = require('core-timer');
const ContentSessionLogResource = Kolibri.resources.ContentSessionLogResource;
const ContentSummaryLogResource = Kolibri.resources.ContentSummaryLogResource;

const intervalTime = 5000;
const progressThreshhold = 0.1;
const timeThreshhold = 15;


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
    pending_save: false,
    start_timestamp: data.start_timestamp,
    completion_timestamp: data.completion_timestamp,
    last_activity_timestamp: data.last_activity_timestamp,
    progress: data.progress,
    total_time: data.total_time,
    extra_fields: data.extra_fields,
    time_spent_before_current_session: data.total_time,
    progress_at_last_update: data.progress,
    duration: data.duration,
  };
  return state;
}

function _contentSessionLoggingState(data) {
  const state = {
    id: data.id,
    pending_save: false,
    start_timestamp: data.start_timestamp,
    completion_timestamp: data.completion_timestamp,
    total_time: data.total_time,
    extra_fields: data.extra_fields,
    total_time_at_last_update: data.total_time,
  };
  return state;
}

function _contentSummaryDefault(store, contentDuration) {
  const mapping = {
    id: null,
    content_id: store.state.pageState.content.content_id,
    channel_id: store.state.core.channel_id,
    user: store.state.core.user_id,
    start_timestamp: new Date(),
    completion_timestamp: null,
    last_activity_timestamp: null,
    progress: 0,
    total_time: 0,
    kind: store.state.pageState.content.kind,
    extra_fields: '{}',
    duration: contentDuration,
  };
  return mapping;
}

function _contentSessionDefault(store) {
  const mapping = {
    id: null,
    content_id: store.state.pageState.content.content_id,
    channel_id: store.state.core.channel_id,
    user: store.state.core.user_id,
    start_timestamp: new Date(),
    completion_timestamp: null,
    total_time: 0,
    kind: store.state.pageState.content.kind,
    extra_fields: '{}',
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
      const pageState = { content: _contentState(attributes) };
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
function initContentSession(store, contentDuration) {
  // const self = this;
  /* TODO: REMOVE THIS LATER */
  store.dispatch('CORE_SET_SESSION', {
    user_id: '1',
    channel_id: '7199dde695db4ee4ab392222d5af1e5c',
  });

  // const summaryCollection = ContentSummaryLogResource.getCollection();
    // summaryCollection.fetch({
    //   content_id: store.state.pageState.content.content_id,
    //   // channel_id: store.state.core.channel_id,
    //   // user: store.state.core.user_id,
    // }).then(summary => {
    //   if (summary.length === 0) {
    //     self.ContentSummaryLogModel = ContentSummaryLogResource.createModel({
    //       content_id: store.state.pageState.content.content_id,
    //       channel_id: store.state.core.channel_id,
    //       user: store.state.core.user_id,
    //       start_timestamp: new Date(),
    //       completion_timestamp: null,
    //       last_activity_timestamp: null,
    //       progress: 0,
    //       total_time: 0,
    //       kind: store.state.pageState.content.kind,
    //       extra_fields: '{}',
    //       duration: contentDuration,
    //     });
    //   } else {
    //     self.ContentSummaryLogModel = summary[0];
    //   }
    //   const loggingState = {
    //     logging: {
    //       summary: _contentSummaryLoggingState(self.ContentSummaryLogModel.attributes),
    //     },
    //   };
    //   store.dispatch('CORE_SET_LOGGING', loggingState);
    //   console.log(store);
    // });

  this.ContentSummaryLogModel = ContentSummaryLogResource.createModel(
    _contentSummaryDefault(store, contentDuration));
  this.ContentSessionModel = ContentSessionLogResource.createModel(
    _contentSessionDefault(store));
  const loggingState = {
    summary: _contentSummaryLoggingState(this.ContentSummaryLogModel.attributes),
    session: _contentSessionLoggingState(this.ContentSessionModel.attributes),
  };
  store.dispatch('SET_LOGGING_STATE', loggingState);
}

/**
 * Do a PATCH to update existing logging models
 * @param {boolean} forceSave
 */
function saveProgress(store) {
  console.log('********** UPDATING PROGRESS **********');
  const summaryLog = store.state.pageState.logging.summary;
  const sessionLog = store.state.pageState.logging.session;

  summaryLog.pending_save = sessionLog.pending_save = true;
  console.log('Summary:', summaryLog);
  console.log('Session:', sessionLog);
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

function updateProgress(store, progressPercent) {
  const summaryLog = store.state.pageState.logging.summary;
  const sessionLog = store.state.pageState.logging.session;

  // Update summary progress
  summaryLog.progress = Math.min(1, progressPercent);
  console.log('PROGRESS:', summaryLog.progress);

  // Update summary completion time if reached 100% progress
  if (summaryLog.progress === 1) {
    summaryLog.completion_timestamp = sessionLog.completion_timestamp;
  }
}

function updateTimeSpent(store, forceSave = false) {
  const summaryLog = store.state.pageState.logging.summary;
  const sessionLog = store.state.pageState.logging.session;

  // Set last activity time
  summaryLog.last_activity_timestamp = sessionLog.completion_timestamp = new Date();

  // Set interaction total time
  sessionLog.total_time = (intervalTimer.getTimeElapsed()
    + sessionLog.total_time_at_last_update) / 1000;

  // Update summary total time
  summaryLog.total_time = sessionLog.total_time
    + summaryLog.time_spent_before_current_session;

  updateProgress(store, (summaryLog.duration) ?
    summaryLog.total_time / summaryLog.duration : 1);

  if (forceSave || (!sessionLog.pending_save && !summaryLog.pending_save &&
    (summaryLog.progress - summaryLog.progress_at_last_update >= progressThreshhold
    || sessionLog.total_time - sessionLog.total_time_at_last_update >= timeThreshhold)
    )) {
    sessionLog.total_time_at_last_update = sessionLog.total_time;
    summaryLog.progress_at_last_update = summaryLog.progress;
    saveProgress(store);
  }
}

/**
 * Start interval timer and set start time
 * @param {int} interval
 */
function startTrackingProgress(store, interval = intervalTime) {
  // Start timer
  intervalTimer.startTimer(interval, this.updateTimeSpent);
}

/**
 * Stop interval timer and update latest times
 */
function stopTrackingProgress(store) {
  // Stop timer and update progress
  intervalTimer.stopTimer();
  updateTimeSpent(store, true);
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
};
