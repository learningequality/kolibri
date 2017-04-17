const coreApp = require('kolibri');
const coreActions = require('kolibri.coreVue.vuex.actions');
const values = require('lodash/values');

const CoreConstants = require('kolibri.coreVue.vuex.constants');
const Constants = require('../../constants');
const ReportConstants = require('../../reportConstants');

const reportGetters = require('../getters/reports');

const RecentReportResourceConstructor = require('../../apiResources/recentReport');
const UserReportResourceConstructor = require('../../apiResources/userReport');
const UserSummaryResourceConstructor = require('../../apiResources/userSummary');
const ContentSummaryResourceConstructor = require('../../apiResources/contentSummary');
const ContentReportResourceConstructor = require('../../apiResources/contentReport');

const RecentReportResource = new RecentReportResourceConstructor(coreApp);
const UserReportResource = new UserReportResourceConstructor(coreApp);
const UserSummaryResource = new UserSummaryResourceConstructor(coreApp);
const ContentSummaryResource = new ContentSummaryResourceConstructor(coreApp);
const ContentReportResource = new ContentReportResourceConstructor(coreApp);

// const AttemptLogResource = coreApp.resources.AttemptLog;
const ChannelResource = coreApp.resources.ChannelResource;


function _showChannelList(store, classId) {
  function channelLastActivePromise(channel) {
    // helper function for _showChannelList
    // @param channel to get recentActivity for
    // @returns promise that resolves channel with lastActive value in object:
    // {
    //   'channelId': dateOfLastActivity,
    // }
    const summaryPayload = {
      channel_id: channel.id,
      collection_kind: ReportConstants.UserScopes.FACILITY,
      collection_id: store.state.core.session.facility_id,
    };

    // workaround for conditionalPromise.then() misbehaving
    return new Promise(
      (resolve, reject) => {
        const getSumm = ContentSummaryResource.getModel(channel.root_id, summaryPayload).fetch();
        getSumm.then(
          channelSummary => {
            const channelLastActive = {};
            channelLastActive[channel.id] = channelSummary.last_active;
            resolve(channelLastActive);
          },
          error => reject(error)
        );
      }
    );
  }

  const channelLastActivePromises = [];
  store.state.core.channels.list.forEach(
    channel => channelLastActivePromises.push(channelLastActivePromise(channel))
  );

  Promise.all(channelLastActivePromises).then(
    allChannelLastActive => {
      const lastActive = {};
      allChannelLastActive.forEach(
        channelLastActive => Object.assign(lastActive, channelLastActive)
      );
      const pageState = {
        lastActive,
        classId,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
    }
  );
}

function _progressState(progressData) {
  // not all of these keys are defined for all requests...
  return {
    // all reports
    totalProgress: progressData.total_progress,
    // content/learner reports
    kind: progressData.kind,
    nodeCount: progressData.node_count,
    // 'recent' reports
    logCountComplete: progressData.log_count_complete,
    logCountTotal: progressData.log_count_total,
  };
}

function _reportState(data) {
  if (!data) { return []; }
  return data.map(row => ({
    contentId: row.content_id,
    kind: row.kind,
    lastActive: row.last_active,
    parent: {
      id: row.parent.pk,
      title: row.parent.title,
    },
    id: row.pk,
    progress: row.progress.map(_progressState),
    title: row.title,
  }));
}

function _contentSummaryState(data) {
  if (!data) { return {}; }
  const kind = !data.ancestors.length ? CoreConstants.ContentNodeKinds.CHANNEL : data.kind;
  return {
    ancestors: data.ancestors.map(item => ({
      id: item.pk,
      title: item.title
    })),
    contentId: data.content_id,
    kind,
    lastActive: data.last_active,
    numUsers: data.num_users,
    id: data.pk,
    progress: data.progress.map(_progressState),
    title: data.title,
  };
}

function _userSummaryState(data) {
  console.log('uuuuuu', data);
  if (!data) {
    return {};
  }
  return data;
}

function _showReport(store, options) {
  const classId = options.classId;
  const channelId = options.channelId;
  const contentScope = options.contentScope;
  const contentScopeId = options.contentScopeId;
  const userScope = options.userScope;
  const userScopeId = options.userScopeId;

  /* check if params are semi-valid. */
  function _validate(value, constants) {
    if (!values(constants).includes(value)) {
      throw Error(`Invalid report parameters: ${value} not in ${JSON.stringify(constants)}`);
    }
  }
  _validate(contentScope, ReportConstants.ContentScopes);
  _validate(userScope, ReportConstants.UserScopes);

  // REPORT
  const reportPayload = {
    channel_id: channelId,
    content_node_id: contentScopeId,
    collection_kind: ReportConstants.UserScopes.CLASSROOM,
    collection_id: classId,
  };
  let reportPromise;
  if (reportGetters.isTopicPage) {
    reportPromise = ContentReportResource.getCollection(reportPayload).fetch();
  } else if (reportGetters.isLearnerPage) {
    reportPromise = UserReportResource.getCollection(reportPayload).fetch();
  } else if (reportGetters.isRecentPage) {
    throw Error('recent report is not currently handled in this action');
  }

  // CONTENT SUMMARY
  const contentPromise = ContentSummaryResource.getModel(contentScopeId, reportPayload).fetch();

  // USER SUMMARY
  let userPromise;
  if (userScope === ReportConstants.UserScopes.USER) {
    userPromise = UserSummaryResource.getModel(userScopeId, reportPayload).fetch();
  }

  const promises = [];
  promises.push(reportPromise);
  promises.push(contentPromise);
  promises.push(userPromise);

  // API response handlers
  Promise.all(promises).then(
    ([report, contentSummary, userSummary]) => {
      const pageState = {
        classId,
        channelId,
        contentScope,
        contentScopeId,
        userScope,
        userScopeId,
        tableData: _reportState(report),
        contentScopeSummary: _contentSummaryState(contentSummary),
        userScopeSummary: _userSummaryState(userSummary),
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => coreActions.handleError(store, error)
  );
}

function _showChannelRoot(store, classId, channelId) {
  const channelPromise = ChannelResource.getModel(channelId).fetch();

  channelPromise.then(
    (channelData) => {
      _showReport(store, {
        classId,
        channelId,
        contentScope: ReportConstants.ContentScopes.ROOT,
        contentScopeId: channelData.root_pk,
        userScope: ReportConstants.UserScopes.CLASSROOM,
        userScopeId: classId,
        sortColumn: ReportConstants.TableColumns.NAME,
        sortOrder: ReportConstants.SortOrders.NONE,
      });
    },
    error => coreActions.handleError(store, error)
  );
}


function _showTopic(store, classId, channelId, topicId) {
  _showReport(store, {
    classId,
    channelId,
    contentScope: ReportConstants.ContentScopes.TOPIC,
    contentScopeId: topicId,
    userScope: ReportConstants.UserScopes.CLASSROOM,
    userScopeId: classId,
    sortColumn: ReportConstants.TableColumns.NAME,
    sortOrder: ReportConstants.SortOrders.NONE,
  });
}

// needs exercise, attemptlog. Pass answerstate into contentrender to display answer
function showCoachExerciseRenderPage(store, classId, userId, channelId, contentId) {
  // function _daysElapsed(startTime, endTime) {
  //   const ONE_DAY = 86400000;
  //   return (Date.UTC(startTime.getYear(), startTime.getMonth(), startTime.getDate()) -
  //     Date.UTC(endTime.getYear(), endTime.getMonth(), endTime.getDate())) / ONE_DAY;
  // }
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.EXERCISE_RENDER);

  // const reversedAttemptLogs = [];
  // const today = new Date();

  // const contentSummaryPayload = {
  //   channel_id: channelId,
  //   content_node_id: contentId,
  //   collection_kind: ReportConstants.UserScopes.USER,
  //   collection_id: userId,
  // };
  //
  // const attemptLogPayload = { // retrieves attempts for a particular exercise
  //   user: userId,
  //   content: contentId,
  // };

  const contentPromises = [];
  const ContentNodeResource = coreApp.resources.ContentNodeResource;

  contentPromises.push(ContentNodeResource.getModel(contentId,
    { channel_id: channelId }).fetch().then((r) => console.log('ContentNode', r)));


  // AttemptLogResource.getCollection(attemptLogPayload).fetch().then(
  //   attemptLogs => {
  //     // pops each attempt log from the front. FILO
  //     attemptLogs.forEach((attemptLog) => {
  //       // adding this information onto the state. Devon likely has issue with this.
  //       // TODO move to view. Maybe use the <elapsed-time>?
  //       attemptLog.daysElapsed = _daysElapsed(today, new Date(attemptLog.end_timestamp));
  //       // use unshift because the original array is in reversed order.
  //       reversedAttemptLogs.unshift(attemptLog);
  //     });
  //     const pageState = {
  //       attemptLogs: reversedAttemptLogs,
  //       selectedAttemptLogIndex: 0, // what's this for?
  //     };
  //
  //     // going to need to set this in individual item pages
  //   },
  //   error => { coreActions.handleApiError(store, error); }
  // );
  Promise.all(contentPromises).then(
    () => {
      // store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_TITLE', 'Exercise Detail View');
    }
  );
}


function showRecentChannels(store, classId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT_CHANNELS);
  store.dispatch('CORE_SET_TITLE', 'Recent - All channels');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  console.log('showRecentChannels');
  _showChannelList(store, classId);
}

function showRecentItemsForChannel(store, classId, channelId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT_ITEMS_FOR_CHANNEL);
  store.dispatch('CORE_SET_TITLE', 'Recent - Items');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  console.log('showRecentItemsForChannel');
  const channelPromise = ChannelResource.getModel(channelId).fetch();

  channelPromise.then(
    channelData => {
      const sevenDaysAgo = new Date();
      // this is being set by default in the backend
      // backend date data might be unreliable, though
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const reportPayload = {
        channel_id: channelId,
        content_node_id: channelData.root_pk,
        collection_kind: ReportConstants.UserScopes.CLASSROOM,
        collection_id: classId,
        last_active_time: sevenDaysAgo,
      };
      const recentReportsPromise = RecentReportResource.getCollection(reportPayload).fetch();

      recentReportsPromise.then(
        reports => {
          const pageState = {
            reports: _reportState(reports),
            classId,
            channelId,
          };
          store.dispatch('SET_PAGE_STATE', pageState);
          store.dispatch('CORE_SET_PAGE_LOADING', false);
          store.dispatch('CORE_SET_ERROR', null);
          store.dispatch('CORE_SET_TITLE', 'Recents');
        },
        error => coreActions.handleApiError(store, error)
      );
    },
    error => coreActions.handleApiError(store, error)
  );
}

function showRecentLearnersForItem(store, classId, channelId, contentId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT_LEARNERS_FOR_ITEM);
  store.dispatch('CORE_SET_TITLE', 'Recent - Learners');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  console.log('showRecentLearnersForItem');
}

function showRecentLearnerItemDetails(store, classId, channelId, contentId, userId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT_LEARNER_ITEM_DETAILS);
  store.dispatch('CORE_SET_TITLE', 'Recent - Learner Details');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  console.log('showRecentLearnerItemDetails');
}

function showTopicChannels(store, classId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPIC_CHANNELS);
  store.dispatch('CORE_SET_TITLE', 'Topics - All channels');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  console.log('showTopicChannels');
  _showChannelList(store, classId);
}

function showTopicChannelRoot(store, classId, channelId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPIC_CHANNEL_ROOT);
  store.dispatch('CORE_SET_TITLE', 'Topics - Channel');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  console.log('showTopicChannelRoot');
  _showChannelRoot(store, classId, channelId);
}

function showTopicItemList(store, classId, channelId, topicId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPIC_ITEM_LIST);
  store.dispatch('CORE_SET_TITLE', 'Topics - Items');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  console.log('showTopicItemList');
  _showTopic(store, classId, channelId, topicId);
}

function showTopicLearnersForItem(store, classId, channelId, contentId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPIC_LEARNERS_FOR_ITEM);
  store.dispatch('CORE_SET_TITLE', 'Topics - Learners');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  console.log('showTopicLearnersForItem');
}

function showTopicLearnerItemDetails(store, classId, channelId, contentId, userId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPIC_LEARNER_ITEM_DETAILS);
  store.dispatch('CORE_SET_TITLE', 'Topics - Learner Details');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  console.log('showTopicLearnerItemDetails');
}

function showLearnerList(store, classId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.LEARNER_LIST);
  store.dispatch('CORE_SET_TITLE', 'Learners');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  console.log('showLearnerList');
}

function showLearnerChannels(store, classId, userId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.LEARNER_CHANNELS);
  store.dispatch('CORE_SET_TITLE', 'Learners - All channels');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  console.log('showLearnerChannels');
  _showChannelList(store, classId);
}

function showLearnerChannelRoot(store, classId, userId, channelId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.LEARNER_CHANNEL_ROOT);
  store.dispatch('CORE_SET_TITLE', 'Learners - Channel');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  console.log('showLearnerChannelRoot');
}

function showLearnerItemList(store, classId, userId, channelId, topicId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.LEARNER_ITEM_LIST);
  store.dispatch('CORE_SET_TITLE', 'Learners - Items');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  console.log('showLearnerItemList');
}

function showLearnerItemDetails(store, classId, userId, channelId, contentId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.LEARNER_ITEM_DETAILS);
  store.dispatch('CORE_SET_TITLE', 'Learners - Item Details');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  console.log('showLearnerItemDetails');
}


module.exports = {
  showCoachExerciseRenderPage, // remove this after making it a helper
  showRecentChannels,
  showRecentItemsForChannel,
  showRecentLearnersForItem,
  showRecentLearnerItemDetails,
  showTopicChannels,
  showTopicChannelRoot,
  showTopicItemList,
  showTopicLearnersForItem,
  showTopicLearnerItemDetails,
  showLearnerList,
  showLearnerChannels,
  showLearnerChannelRoot,
  showLearnerItemList,
  showLearnerItemDetails,
};
