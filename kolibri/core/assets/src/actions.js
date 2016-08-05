const Kolibri = require('kolibri');
const intervalTimer = require('./timer');

// const ContentInteractionLogResource = Kolibri.resources.ContentInteractionLogResource;
const ContentSummaryLogResource = Kolibri.resources.ContentSummaryLogResource;
const intervalTime = 5000;

function _contentSummaryLoggingState(data) {
  const state = {
    id: data.id,
    pending_save: data.id !== null,
    content_id: data.content_id,
    channel_id: data.channel_id,
    user: 1,
    start_timestamp: data.start_timestamp,
    completion_timestamp: data.completion_timestamp,
    last_activity_timestamp: data.last_activity_timestamp,
    progress: data.progress,
    total_time: data.total_time ? data.total_time : 0,
    kind: data.kind,
    extra_fields: data.extra_fields,
    accumulated_time: data.total_time ? data.total_time : 0,
    duration: 1,
  };
  return state;
}

// function _contentSummaryModel(store) {
//   const state = {
//     id: data.id,
//     pending_save: data.id !== null,
//     content_id: data.content_id,
//     channel_id: data.channel_id,
//     user: 1,
//     start_timestamp: data.start_timestamp,
//     completion_timestamp: data.completion_timestamp,
//     last_activity_timestamp: data.last_activity_timestamp,
//     progress: data.progress,
//     total_time: data.total_time ? data.total_time : 0,
//     kind: data.kind,
//     extra_fields: data.extra_fields,
//     accumulated_time: data.total_time ? data.total_time : 0,
//     duration: 1,
//   };
//   return state;
// }

// function _contentSessionLoggingState(data) {
//   const state = {
//     id: null,
//     pending_save: false,
//     content_id: data.content_id,
//     channel_id: '7199dde695db4ee4ab392222d5af1e5c',
//     user: 1,
//     start_timestamp: null,
//     completion_timestamp: null,
//     total_time: 0,
//     kind: data.kind,
//     extra_fields: data.extra_fields,
//   };
//   return state;
// }


/**
 * Create models to store progress
 */
function initContentSession(store, duration) {
  const summaryCollection = ContentSummaryLogResource.getCollection();
  // const logging = store.state.pageState.logging;

  summaryCollection.fetch({
    content_id: store.state.pageState.content.content_id,
    channel_id: '7199dde695db4ee4ab392222d5af1e5c', // store.core.channel_id,
    user: 1, // store.core.user_id,
  }).then(summary => {
    console.log('Return', summary);
    if (summary.length === 0) {
      // logging.pending_save = true;
      this.ContentSummaryLogModel = ContentSummaryLogResource.createModel({
        content_id: store.state.pageState.content.content_id,
        channel_id: '7199dde695db4ee4ab392222d5af1e5c', // store.core.channel_id,
        user: 1, // store.core.user_id,
      });
      console.log(this.ContentSummaryLogModel);
    } else {
      this.ContentSummaryLogModel = summary;
    }
    const loggingState = {
      logging: {
        summary: _contentSummaryLoggingState(summary),
      },
    };
    store.dispatch('SET_LOGGING_STATE', loggingState);
  });
  // // Set starting time
  // store.state.pageState.logging.interaction.start_timestamp = new Date();
  // if (!store.state.pageState.logging.summary.start_timestamp) {
  //   store.state.pageState.logging.summary.start_timestamp =
  //     store.state.pageState.logging.interaction.start_timestamp;
  // }
  // console.log('init');
  // // Create models to store data
  // this.ContentSummaryLogModel = ContentSummaryLogResource
  //   .createModel(store.state.pageState.logging.summary);
  // this.ContentInteractionLogModel = ContentInteractionLogResource
  //   .createModel(store.state.pageState.logging.interaction);
  // console.log('********** AT INIT **********');
  // console.log('Summary:', this.ContentSummaryLogModel);
  // console.log('Interaction:', this.ContentInteractionLogModel);
}

/**
 * Set total duration to properly set progress percentage
 */
function setDuration(store, duration) {
  // Update duration
  store.state.pageState.logging.summary.duration = duration * 1000;
}

/**
 * Do a PATCH to update existing logging models
 * @param {boolean} forceSave
 */
function updateProgress(store, forceSave = false) {
  if (forceSave || (!store.state.pageState.logging.summary.pending_save
    && !store.state.pageState.logging.interaction.pending_save)) {
    // Set interaction total time
    store.state.pageState.logging.interaction.total_time = intervalTimer.getTimeElapsed();

    // Set last activity time
    store.state.pageState.logging.summary.last_activity_timestamp =
      store.state.pageState.logging.interaction.completion_timestamp = new Date();

    // Update summary total time
    store.state.pageState.logging.summary.total_time =
      store.state.pageState.logging.summary.accumulated_time +
      store.state.pageState.logging.interaction.total_time;

    // Update summary progress
    store.state.pageState.logging.summary.progress =
      Math.min(100, store.state.pageState.logging.summary.total_time /
      store.state.pageState.logging.summary.duration * 100);
    console.log(store.state.pageState.logging.summary.total_time);

    // Update summary completion time if reached 100% progress
    if (store.state.pageState.logging.summary.progress === 100) {
      store.state.pageState.logging.summary.completion_timestamp =
        store.state.pageState.logging.interaction.completion_timestamp;
    }

    console.log('********** UPDATING PROGRESS **********');
    console.log('Summary:', store.state.pageState.logging.summary);
    console.log('Interaction:', store.state.pageState.logging.interaction);

    store.state.pageState.logging.summary.pending_save =
      store.state.pageState.logging.interaction.pending_save = true;

    // Save updated values
    /* TODO: REMOVE- temporary hack to test automatic saving on intervals */
    setTimeout(() => {
      store.state.pageState.logging.summary.pending_save =
        store.state.pageState.logging.interaction.pending_save = false;
    }, 5000);
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
}

/**
 * Start interval timer and set start time
 * @param {int} interval
 */
function startTrackingProgress(store, interval = intervalTime) {
  // Start timer
  intervalTimer.startTimer(interval, this.updateProgress);
}

/**
 * Stop interval timer and update latest times
 */
function stopTrackingProgress(store) {
  // Stop timer and update progress
  intervalTimer.stopTimer();
  updateProgress(store, true);
}

module.exports = {
  initContentSession,
  startTrackingProgress,
  stopTrackingProgress,
  updateProgress,
  setDuration,
};
