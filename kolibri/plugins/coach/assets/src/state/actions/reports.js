const coreApp = require('kolibri');
const coreActions = require('kolibri.coreVue.vuex.actions');
const coreGetters = require('kolibri.coreVue.vuex.getters');
const { assessmentMetaDataState } = require('kolibri.coreVue.vuex.mappers');

const CoreConstants = require('kolibri.coreVue.vuex.constants');
const Constants = require('../../constants');
const ReportConstants = require('../../reportConstants');
const { setClassState } = require('./main');
const { now } = require('kolibri.utils.serverClock');

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

const AttemptLogResource = coreApp.resources.AttemptLog;
const ChannelResource = coreApp.resources.ChannelResource;
const ContentNodeResource = coreApp.resources.ContentNodeResource;
const FacilityUserResource = coreApp.resources.FacilityUserResource;
const SummaryLogResource = coreApp.resources.ContentSummaryLogResource;

/**
 * Helper function for _showChannelList
 * @param {object} channel - to get recentActivity for
 * @param {string} classId -
 * @returns {Promise} that resolves channel with lastActive value in object:
 *   { 'channelId': dateOfLastActivity }
*/
function channelLastActivePromise(channel, classId) {
  const summaryPayload = {
    channel_id: channel.id,
    collection_kind: ReportConstants.UserScopes.CLASSROOM,
    collection_id: classId,
  };

  // workaround for conditionalPromise.then() misbehaving
  return new Promise(
    (resolve, reject) => {
      const getSumm = ContentSummaryResource.getModel(channel.root_id, summaryPayload).fetch();
      getSumm.then(
        channelSummary => {
          const obj = Object.assign({}, channelSummary, {
            channelId: channel.id,
          });
          resolve(obj);
        },
        error => reject(error)
      );
    }
  );
}

function getAllChannelsLastActivePromise(channels, classId) {
  const promises = channels.map((channel) => channelLastActivePromise(channel, classId));
  return Promise.all(promises);
}

function _channelReportState(data) {
  if (!data) { return []; }
  return data.map(row => ({
    lastActive: row.last_active,
    id: row.channelId,
    progress: row.progress.map(progressData => ({
      kind: progressData.kind,
      nodeCount: progressData.node_count,
      totalProgress: progressData.total_progress,
    })),
    title: row.title,
  }));
}

function _showChannelList(store, classId, showRecentOnly = false) {
  // don't handle super users
  if (coreGetters.isSuperuser(store.state)) {
    store.dispatch('SET_PAGE_STATE', {});
    store.dispatch('CORE_SET_PAGE_LOADING', false);
    store.dispatch('CORE_SET_ERROR', null);
    return Promise.resolve();
  }

  const promises = [
    getAllChannelsLastActivePromise(store.state.core.channels.list, classId),
    setClassState(store, classId),
  ];

  return Promise.all(promises).then(
    ([allChannelLastActive]) => {
      store.dispatch('SET_RECENT_ONLY', showRecentOnly);
      const reportProps = {
        userScope: ReportConstants.UserScopes.CLASSROOM,
        userScopeId: classId,
        viewBy: ReportConstants.ViewBy.CHANNEL,
      };
      store.dispatch('SET_REPORT_PROPERTIES', reportProps);
      store.dispatch('SET_REPORT_TABLE_DATA', _channelReportState(allChannelLastActive));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
    }
  );
}

function _contentReportState(data) {
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
    progress: row.progress.map(progressData => ({
      kind: progressData.kind,
      nodeCount: progressData.node_count,
      totalProgress: progressData.total_progress,
    })),
    title: row.title,
  }));
}

function _recentReportState(data) {
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
    progress: row.progress.map(progressData => ({
      logCountComplete: progressData.log_count_complete,
      logCountTotal: progressData.log_count_total,
      totalProgress: progressData.total_progress,
    })),
    title: row.title,
  }));
}

function _learnerReportState(data) {
  if (!data) { return []; }
  return data.map(row => ({
    id: row.pk.toString(), // see https://github.com/learningequality/kolibri/issues/1255
    fullName: row.full_name,
    lastActive: row.last_active,
    progress: row.progress.map(progressData => ({
      kind: progressData.kind,
      timeSpent: progressData.time_spent,
      totalProgress: progressData.total_progress,
    })),
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
    progress: data.progress.map(progressData => ({
      kind: progressData.kind,
      nodeCount: progressData.node_count,
      totalProgress: progressData.total_progress,
    })),
    title: data.title,
  };
}

function _userSummaryState(data) {
  if (!data) {
    return {};
  }
  return data;
}

function _setContentReport(store, reportPayload) {
  const reportPromise = ContentReportResource.getCollection(reportPayload).fetch();
  reportPromise.then(report => {
    store.dispatch('SET_REPORT_TABLE_DATA', _contentReportState(report));
  });
  return reportPromise;
}

function _setLearnerReport(store, reportPayload) {
  const reportPromise = UserReportResource.getCollection(reportPayload).fetch();
  reportPromise.then(report => {
    store.dispatch('SET_REPORT_TABLE_DATA', _learnerReportState(report));
  });
  return reportPromise;
}

function _setContentSummary(store, contentScopeId, reportPayload) {
  const contentPromise = ContentSummaryResource.getModel(contentScopeId, reportPayload).fetch();
  contentPromise.then(contentSummary => {
    store.dispatch('SET_REPORT_CONTENT_SUMMARY', _contentSummaryState(contentSummary));
  });
  return contentPromise;
}

function _setUserSummary(store, userScopeId, reportPayload) {
  const userPromise = UserSummaryResource.getModel(userScopeId, reportPayload).fetch();
  userPromise.then(userSummary => {
    store.dispatch('SET_REPORT_USER_SUMMARY', _userSummaryState(userSummary));
  });
  return userPromise;
}

function _showContentList(store, options) {
  const reportPayload = {
    channel_id: options.channelId,
    content_node_id: options.contentScopeId,
    collection_kind: options.userScope,
    collection_id: options.classId,
  };
  const promises = [
    _setContentSummary(store, options.contentScopeId, reportPayload),
    _setContentReport(store, reportPayload),
  ];
  Promise.all(promises).then(
    () => {
      const reportProps = {
        channelId: options.channelId,
        contentScope: options.contentScope,
        contentScopeId: options.contentScopeId,
        userScope: options.userScope,
        userScopeId: options.userScopeId,
        viewBy: ReportConstants.ViewBy.CONTENT,
      };
      store.dispatch('SET_REPORT_PROPERTIES', reportProps);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => coreActions.handleError(store, error)
  );
}

function _showLearnerList(store, options) {
  const reportPayload = {
    channel_id: options.channelId,
    content_node_id: options.contentScopeId,
    collection_kind: options.userScope,
    collection_id: options.classId,
  };
  const promises = [
    _setContentSummary(store, options.contentScopeId, reportPayload),
    _setLearnerReport(store, reportPayload),
  ];
  Promise.all(promises).then(
    () => {
      const reportProps = {
        channelId: options.channelId,
        contentScope: options.contentScope,
        contentScopeId: options.contentScopeId,
        userScope: options.userScope,
        userScopeId: options.userScopeId,
        viewBy: ReportConstants.ViewBy.LEARNER,
      };
      store.dispatch('SET_REPORT_PROPERTIES', reportProps);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => coreActions.handleError(store, error)
  );
}

// needs exercise, attemptlog. Pass answerstate into contentrender to display answer
function _showExerciseDetailView(store, classId, userId, channelId, contentId,
  attemptLogIndex, interactionIndex) {
  Promise.all([
    ContentNodeResource.getCollection({ channel_id: channelId }, { content_id: contentId }).fetch(),
    AttemptLogResource.getCollection({ user: userId, content: contentId }).fetch(),
    SummaryLogResource.getCollection({ user_id: userId, content_id: contentId }).fetch(),
    FacilityUserResource.getModel(userId).fetch(),
    setClassState(store, classId),
  ]).then(
    ([exercises, attemptLogs, summaryLog, user]) => {
      // MAPPERS NEEDED
      // attemptLogState
      // attemptLogListState
      // interactionState
      // InteractionHistoryState
      // user?

      const exercise = exercises[0];

      // FIRST LOOP: Sort them by most recent
      attemptLogs.sort(
        (attemptLog1, attemptLog2) =>
          new Date(attemptLog2.end_timestamp) - new Date(attemptLog1.end_timestamp)
      );

      const exerciseQuestions = assessmentMetaDataState(exercise).assessmentIds;
      // SECOND LOOP: Add their question number
      if (exerciseQuestions && exerciseQuestions.length) {
        attemptLogs.forEach(
          attemptLog => {
            attemptLog.questionNumber = (exerciseQuestions.indexOf(attemptLog.item) + 1);
          }
        );
      }

      const currentAttemptLog = attemptLogs[attemptLogIndex] || {};

      const currentInteractionHistory = currentAttemptLog.interaction_history || [];

      const pageState = {
        // because this is info returned from a collection
        user,
        exercise,
        attemptLogs,
        currentAttemptLog,
        interactionIndex,
        currentInteractionHistory,
        currentInteraction: currentInteractionHistory[interactionIndex],
        summaryLog: summaryLog[0],
        channelId,
        attemptLogIndex,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      coreActions.handleApiError(store, error);
    }
  );
}

function clearReportSorting(store) {
  store.dispatch('SET_REPORT_SORTING');
}

function setReportSorting(store, sortColumn, sortOrder) {
  store.dispatch('SET_REPORT_SORTING', sortColumn, sortOrder);
}


function showRecentChannels(store, classId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT_CHANNELS);
  store.dispatch('CORE_SET_TITLE', 'Recent - All channels');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  _showChannelList(store, classId, true /* showRecentOnly */);
  store.dispatch(
    'SET_REPORT_SORTING',
    ReportConstants.TableColumns.DATE,
    ReportConstants.SortOrders.DESCENDING
  );
}


function showRecentItemsForChannel(store, classId, channelId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT_ITEMS_FOR_CHANNEL);
  store.dispatch('CORE_SET_TITLE', 'Recent - Items');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  const channelPromise = ChannelResource.getModel(channelId).fetch();

  Promise.all([channelPromise, setClassState(store, classId)]).then(
    ([channelData]) => {
      const sevenDaysAgo = now();
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
          store.dispatch('SET_REPORT_TABLE_DATA', _recentReportState(reports));
          const reportProps = {
            channelId,
            userScope: ReportConstants.UserScopes.CLASSROOM,
            userScopeId: classId,
            viewBy: ReportConstants.ViewBy.RECENT,
          };
          store.dispatch('SET_REPORT_PROPERTIES', reportProps);
          store.dispatch(
            'SET_REPORT_SORTING',
            ReportConstants.TableColumns.DATE,
            ReportConstants.SortOrders.DESCENDING
          );
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

  _showLearnerList(store, {
    classId,
    channelId,
    contentScope: ReportConstants.ContentScopes.CONTENT,
    contentScopeId: contentId,
    userScope: ReportConstants.UserScopes.CLASSROOM,
    userScopeId: classId,
  });
}

function showRecentLearnerItemDetails(store, classId, userId, channelId, contentId,
  questionNumber, interactionIndex) {
  if (store.state.pageName !== Constants.PageNames.RECENT_LEARNER_ITEM_DETAILS) {
    store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT_LEARNER_ITEM_DETAILS);
    store.dispatch('CORE_SET_PAGE_LOADING', true);
  }
  store.dispatch('CORE_SET_TITLE', 'Recent - Learner Details');
  _showExerciseDetailView(store, classId, userId, channelId, contentId,
    questionNumber, interactionIndex);
}

function showTopicChannels(store, classId) {
  clearReportSorting(store);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPIC_CHANNELS);
  store.dispatch('CORE_SET_TITLE', 'Topics - All channels');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  _showChannelList(store, classId);
}

function showTopicChannelRoot(store, classId, channelId) {
  clearReportSorting(store);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPIC_CHANNEL_ROOT);
  store.dispatch('CORE_SET_TITLE', 'Topics - Channel');
  store.dispatch('CORE_SET_PAGE_LOADING', true);

  const channelPromise = ChannelResource.getModel(channelId).fetch();
  channelPromise.then(
    (channelData) => {
      _showContentList(store, {
        classId,
        channelId,
        contentScope: ReportConstants.ContentScopes.ROOT,
        contentScopeId: channelData.root_pk,
        userScope: ReportConstants.UserScopes.CLASSROOM,
        userScopeId: classId,
      });
    },
    error => coreActions.handleError(store, error)
  );
}

function showTopicItemList(store, classId, channelId, topicId) {
  clearReportSorting(store);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPIC_ITEM_LIST);
  store.dispatch('CORE_SET_TITLE', 'Topics - Items');
  store.dispatch('CORE_SET_PAGE_LOADING', true);

  _showContentList(store, {
    classId,
    channelId,
    contentScope: ReportConstants.ContentScopes.ROOT,
    contentScopeId: topicId,
    userScope: ReportConstants.UserScopes.CLASSROOM,
    userScopeId: classId,
  });
}

function showTopicLearnersForItem(store, classId, channelId, contentId) {
  clearReportSorting(store);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPIC_LEARNERS_FOR_ITEM);
  store.dispatch('CORE_SET_TITLE', 'Topics - Learners');
  store.dispatch('CORE_SET_PAGE_LOADING', true);

  _showLearnerList(store, {
    classId,
    channelId,
    contentScope: ReportConstants.ContentScopes.CONTENT,
    contentScopeId: contentId,
    userScope: ReportConstants.UserScopes.CLASSROOM,
    userScopeId: classId,
  });
}

function showTopicLearnerItemDetails(store, classId, userId, channelId, contentId,
  questionNumber, interactionIndex) {
  if (store.state.pageName !== Constants.PageNames.TOPIC_LEARNER_ITEM_DETAILS) {
    store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPIC_LEARNER_ITEM_DETAILS);
    store.dispatch('CORE_SET_PAGE_LOADING', true);
  }
  store.dispatch('CORE_SET_TITLE', 'Topics - Learner Details');
  _showExerciseDetailView(store, classId, userId, channelId, contentId,
    questionNumber, interactionIndex);
}

function showLearnerList(store, classId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.LEARNER_LIST);
  store.dispatch('CORE_SET_TITLE', 'Learners');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
}

function showLearnerChannels(store, classId, userId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.LEARNER_CHANNELS);
  store.dispatch('CORE_SET_TITLE', 'Learners - All channels');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  _showChannelList(store, classId);
}

function showLearnerChannelRoot(store, classId, userId, channelId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.LEARNER_CHANNEL_ROOT);
  store.dispatch('CORE_SET_TITLE', 'Learners - Channel');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
}

function showLearnerItemList(store, classId, userId, channelId, topicId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.LEARNER_ITEM_LIST);
  store.dispatch('CORE_SET_TITLE', 'Learners - Items');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
}

function showLearnerItemDetails(store, classId, userId, channelId, contentId,
  questionNumber, interactionIndex) {
  if (store.state.pageName !== Constants.PageNames.LEARNER_ITEM_DETAILS) {
    store.dispatch('SET_PAGE_NAME', Constants.PageNames.LEARNER_ITEM_DETAILS);
    store.dispatch('CORE_SET_PAGE_LOADING', true);
  }
  store.dispatch('CORE_SET_TITLE', 'Learners - Item Details');
  _showExerciseDetailView(store, classId, userId, channelId, contentId,
    questionNumber, interactionIndex);
}


module.exports = {
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
  setReportSorting,
  _setUserSummary,
};
