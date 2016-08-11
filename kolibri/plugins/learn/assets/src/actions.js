
const Kolibri = require('kolibri');
const ContentNodeResource = require('kolibri').resources.ContentNodeResource;
const ChannelResource = require('kolibri').resources.ChannelResource;
const ContentSessionLogResource = Kolibri.resources.ContentSessionLogResource;
const ContentSummaryLogResource = Kolibri.resources.ContentSummaryLogResource;
const constants = require('./state/constants');
const PageNames = constants.PageNames;
const cookiejs = require('js-cookie');
const router = require('router');
const intervalTimer = require('core-timer');

const intervalTime = 5000;
const progressThreshold = 0.2; // Update logs if user has reached 20% more progress
const timeThreshold = 30; // Update logs if 30 seconds have passed since last update


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
  const summaryLog = store.state.pageState.logging.summary;
  const mapping = {
    content_id: store.state.pageState.content.content_id,
    channel_id: store.state.currentChannel,
    user: store.state.core.session.user_id,
    start_timestamp: summaryLog.start_timestamp,
    end_timestamp: summaryLog.end_timestamp,
    completion_timestamp: summaryLog.completion_timestamp,
    progress: summaryLog.progress,
    time_spent: summaryLog.time_spent,
    kind: store.state.pageState.content.kind,
    extra_fields: summaryLog.extra_fields,
  };
  return mapping;
}


function _contentSessionModel(store) {
  const sessionLog = store.state.pageState.logging.session;
  const mapping = {
    content_id: store.state.pageState.content.content_id,
    channel_id: store.state.currentChannel,
    user: store.state.core.session.user_id,
    start_timestamp: sessionLog.start_timestamp,
    end_timestamp: sessionLog.end_timestamp,
    time_spent: sessionLog.time_spent,
    progress: sessionLog.progress,
    kind: store.state.pageState.content.kind,
    extra_fields: sessionLog.extra_fields,
  };
  return mapping;

/*
* Returns a promise that gets current channel.
 */
function _getCurrentChannel() {
  let currentChannelId = null;
  return new Promise((resolve, reject) => {
    ChannelResource.getCollection({}).fetch()
      .then((channelList) => {
        const cookieCurrentChannelId = cookiejs.get('currentChannel');
        if (channelList.some((channel) => channel.id === cookieCurrentChannelId)) {
          currentChannelId = cookieCurrentChannelId;
          resolve(currentChannelId);
        } else {
          currentChannelId = channelList[0].id;
          resolve(currentChannelId);
        }
      });
  });
}


/**
 * Actions
 *
 * These methods are used to update client-side state
 */

function redirectToExploreChannel(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_ROOT);
  _getCurrentChannel()
    .then((currentChannel) => {
      store.dispatch('SET_CURRENT_CHANNEL', currentChannel);
      cookiejs.set('currentChannel', currentChannel);
      store.dispatch('CORE_SET_ERROR', null);
      router.go(
        {
          name: constants.PageNames.EXPLORE_CHANNEL,
          params: {
            channel_id: currentChannel,
          },
        }
      );
    })
    .catch((error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}

function redirectToLearnChannel(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.LEARN_ROOT);
  _getCurrentChannel()
    .then((currentChannel) => {
      store.dispatch('SET_CURRENT_CHANNEL', currentChannel);
      cookiejs.set('currentChannel', currentChannel);
      store.dispatch('CORE_SET_ERROR', null);
      router.go(
        {
          name: constants.PageNames.LEARN_CHANNEL,
          params: {
            channel_id: currentChannel,
          },
        }
      );
    })
    .catch((error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}

function showExploreTopic(store, channelId, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_CHANNEL);
  store.dispatch('SET_CURRENT_CHANNEL', channelId);
  cookiejs.set('currentChannel', channelId);

  const attributesPromise = ContentNodeResource.getModel(id).fetch();
  const childrenPromise = ContentNodeResource.getCollection({ parent: id }).fetch();
  const channelPromise = ChannelResource.getCollection({}).fetch();

  Promise.all([attributesPromise, childrenPromise, channelPromise])
    .then(([attributes, children, channelList]) => {
      const pageState = { id };
      pageState.topic = _topicState(attributes);
      const collection = _collectionState(children);
      pageState.subtopics = collection.topics;
      pageState.contents = collection.contents;
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('SET_CHANNEL_LIST', channelList);
    })
    .catch((error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}


function showExploreContent(store, channelId, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.EXPLORE_CONTENT);
  store.dispatch('SET_CURRENT_CHANNEL', channelId);
  cookiejs.set('currentChannel', channelId);

  const attributesPromise = ContentNodeResource.getModel(id).fetch();
  const channelPromise = ChannelResource.getCollection({}).fetch();

  Promise.all([attributesPromise, channelPromise])
    .then(([attributes, channelList]) => {
      const pageState = {
        content: _contentState(attributes),
        logging: { summary: { progress: 0 } }, // To avoid error thrown by vue getter
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('SET_CHANNEL_LIST', channelList);
    })
    .catch((error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}


function showLearnChannel(store, channelId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.LEARN_CHANNEL);
  store.dispatch('SET_CURRENT_CHANNEL', channelId);
  cookiejs.set('currentChannel', channelId);

  const recommendedPromise = ContentNodeResource.getCollection({ recommendations: '' }).fetch();
  const channelPromise = ChannelResource.getCollection({}).fetch();

  Promise.all([recommendedPromise, channelPromise])
    .then(([recommendations, channelList]) => {
      const pageState = { recommendations: recommendations.map(_contentState) };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('SET_CHANNEL_LIST', channelList);
    })
    .catch((error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}


function showLearnContent(store, channelId, id) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.LEARN_CONTENT);
  store.dispatch('SET_CURRENT_CHANNEL', channelId);
  cookiejs.set('currentChannel', channelId);

  const attributesPromise = ContentNodeResource.getModel(id).fetch();
  const recommendedPromise = ContentNodeResource.getCollection({ recommendations_for: id }).fetch();
  const channelPromise = ChannelResource.getCollection({}).fetch();

  Promise.all([attributesPromise, recommendedPromise, channelPromise])
    .then(([attributes, recommended, channelList]) => {
      const pageState = {
        content: _contentState(attributes),
        recommended: recommended.map(_contentState),
        logging: { summary: { progress: 0 } },
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('SET_CHANNEL_LIST', channelList);
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

  const contentCollection = ContentNodeResource.getPagedCollection({ search: searchTerm });
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
  /* Set initial logging state */
  const loggingState = {
    summary: { progress: 0 },
    session: { },
  };
  store.dispatch('INIT_LOGGING_STATE', loggingState);

  /* Create summary log iff user exists */
  if (store.state.core.session.user_id) {
     /* Fetch collection matching content and user */
    const summaryCollection = ContentSummaryLogResource.getCollection({
      content_id: store.state.pageState.content.content_id,
      user: store.state.core.user_id,
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

        /* Save a new summary model and set id on state */
        const summaryModel = ContentSummaryLogResource.createModel(_contentSummaryModel(store));
        summaryModel.save().then((summaryData) => {
          store.dispatch('SET_LOGGING_SUMMARY_ID', summaryData.pk);
        });
      }
    });
  }

  /* Set session log state to default */
  store.dispatch('SET_LOGGING_SESSION_STATE', _contentSessionLoggingState({
    pk: null,
    content_id: store.state.pageState.content.content_id,
    channel_id: store.state.core.session.channel_id,
    user: store.state.core.session.user_id,
    start_timestamp: new Date(),
    end_timestamp: null,
    time_spent: 0,
    progress: 0,
    kind: store.state.pageState.content.kind,
    extra_fields: '{}',
  }));

  /* Save a new session model and set id on state */
  const sessionModel = ContentSessionLogResource.createModel(_contentSessionModel(store));
  sessionModel.save().then((sessionData) => {
    store.dispatch('SET_LOGGING_SESSION_ID', sessionData.pk);
  });
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
  const summaryLog = store.state.pageState.logging.summary;
  const sessionLog = store.state.pageState.logging.session;

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
    this.saveLogs();
  }
}


/**
 * Update the total time spent and end time stamps
 * To be called periodically by interval timer
 * Must be called after initContentSession
 * @param {boolean} forceSave
 */
function updateTimeSpent(store, forceSave = false) {
  /* Create aliases for logs */
  const summaryLog = store.state.pageState.logging.summary;
  const sessionLog = store.state.pageState.logging.session;

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
    this.saveLogs();
  }
}


/**
 * Do a PATCH to update existing logging models
 * Must be called after initContentSession
 */
function saveLogs(store) {
  /* Create aliases for logs */
  const summaryLog = store.state.pageState.logging.summary;
  const sessionLog = store.state.pageState.logging.session;

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
 * Must be called after initContentSession
 */
function startTrackingProgress(store, interval = intervalTime) {
  intervalTimer.startTimer(interval, this.updateTimeSpent);
}


/**
 * Stop interval timer and update latest times
 * Must be called after startTrackingProgress
 */
function stopTrackingProgress(store) {
  intervalTimer.stopTimer();
  this.updateTimeSpent(true);
}

module.exports = {
  redirectToExploreChannel,
  redirectToLearnChannel,
  showExploreTopic,
  showExploreContent,
  showLearnChannel,
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
};
