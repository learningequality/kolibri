const coreApp = require('kolibri');
const coreActions = require('kolibri.coreVue.vuex.actions');
const coreGetters = require('kolibri.coreVue.vuex.getters');

const CoreConstants = require('kolibri.coreVue.vuex.constants');
const Constants = require('../../constants');
const ReportConstants = require('../../reportConstants');

const RecentReportResourceConstructor = require('../../apiResources/recentReport');
// const UserReportResourceConstructor = require('../../apiResources/userReport');
// const UserSummaryResourceConstructor = require('../../apiResources/userSummary');
const ContentSummaryResourceConstructor = require('../../apiResources/contentSummary');
const ContentReportResourceConstructor = require('../../apiResources/contentReport');

const RecentReportResource = new RecentReportResourceConstructor(coreApp);
// const UserReportResource = new UserReportResourceConstructor(coreApp);
// const UserSummaryResource = new UserSummaryResourceConstructor(coreApp);
const ContentSummaryResource = new ContentSummaryResourceConstructor(coreApp);
const ContentReportResource = new ContentReportResourceConstructor(coreApp);

const ChannelResource = coreApp.resources.ChannelResource;


function _showChannelList(store, classId) {
  // don't handle super users
  if (coreGetters.isSuperuser(store.state)) {
    store.dispatch('SET_PAGE_STATE', {});
    store.dispatch('CORE_SET_PAGE_LOADING', false);
    store.dispatch('CORE_SET_ERROR', null);
    return;
  }

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

function _contentReportState(data) {
  console.log('dddddd', data);
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

// function _learnerReportState(data) {
//   console.log('lllllll', data);
//   if (!data) { return []; }
//   return data.map(row => ({
//     contentId: row.content_id,
//     kind: row.kind,
//     lastActive: row.last_active,
//     parent: {
//       id: row.parent.pk,
//       title: row.parent.title,
//     },
//     id: row.pk,
//     progress: row.progress.map(_progressState),
//     title: row.title,
//   }));
// }

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

// function _userSummaryState(data) {
//   console.log('uuuuuu', data);
//   if (!data) {
//     return {};
//   }
//   return data;
// }

function _setContentReport(store, reportPayload) {
  const reportPromise = ContentReportResource.getCollection(reportPayload).fetch();
  reportPromise.then(report => {
    store.dispatch('SET_REPORT_TABLE_DATA', _contentReportState(report));
  });
  return reportPromise;
}

// function _setLearnerReport(store, reportPayload) {
//   const reportPromise = UserReportResource.getCollection(reportPayload).fetch();
//   reportPromise.then(report => {
//     store.dispatch('SET_REPORT_TABLE_DATA', _learnerReportState(report));
//   });
//   return reportPromise;
// }

function _setContentSummary(store, contentScopeId, reportPayload) {
  const contentPromise = ContentSummaryResource.getModel(contentScopeId, reportPayload).fetch();
  contentPromise.then(contentSummary => {
    store.dispatch('SET_REPORT_CONTENT_SUMMARY', _contentSummaryState(contentSummary));
  });
  return contentPromise;
}

// function _setUserSummary(store, userScopeId, reportPayload) {
//   const userPromise = UserSummaryResource.getModel(userScopeId, reportPayload).fetch();
//   userPromise.then(userSummary => {
//     store.dispatch('SET_REPORT_USER_SUMMARY', _userSummaryState(userSummary));
//   });
//   return userPromise;
// }


function showRecentChannels(store, classId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT_CHANNELS);
  store.dispatch('CORE_SET_TITLE', 'Recent - All channels');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  _showChannelList(store, classId);
}


function showRecentItemsForChannel(store, classId, channelId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT_ITEMS_FOR_CHANNEL);
  store.dispatch('CORE_SET_TITLE', 'Recent - Items');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
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
            reports: _contentReportState(reports),
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
}

function showRecentLearnerItemDetails(store, classId, channelId, contentId, userId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT_LEARNER_ITEM_DETAILS);
  store.dispatch('CORE_SET_TITLE', 'Recent - Learner Details');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
}

function showTopicChannels(store, classId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPIC_CHANNELS);
  store.dispatch('CORE_SET_TITLE', 'Topics - All channels');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  _showChannelList(store, classId);
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
        classId: options.classId,
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

function showTopicChannelRoot(store, classId, channelId) {
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
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPIC_LEARNERS_FOR_ITEM);
  store.dispatch('CORE_SET_TITLE', 'Topics - Learners');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
}

function showTopicLearnerItemDetails(store, classId, channelId, contentId, userId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPIC_LEARNER_ITEM_DETAILS);
  store.dispatch('CORE_SET_TITLE', 'Topics - Learner Details');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
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

function showLearnerItemDetails(store, classId, userId, channelId, contentId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.LEARNER_ITEM_DETAILS);
  store.dispatch('CORE_SET_TITLE', 'Learners - Item Details');
  store.dispatch('CORE_SET_PAGE_LOADING', true);
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
};
