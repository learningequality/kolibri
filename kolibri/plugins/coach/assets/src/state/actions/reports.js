const coreApp = require('kolibri');
const coreActions = require('kolibri.coreVue.vuex.actions');
// const router = require('kolibri.coreVue.router');

const Constants = require('../../constants');
const ReportConstants = require('../../reportConstants');

const RecentReportResourceConstructor = require('../../apiResources/recentReport');
// const ContentReportResourceConstructor = require('../../apiResources/contentReport');
// const UserReportResourceConstructor = require('../../apiResources/userReport');
// const UserSummaryResourceConstructor = require('../../apiResources/userSummary');
const ContentSummaryResourceConstructor = require('../../apiResources/contentSummary');

// const UserSummaryResource = new UserSummaryResourceConstructor(coreApp);
// const UserReportResource = new UserReportResourceConstructor(coreApp);
const ContentSummaryResource = new ContentSummaryResourceConstructor(coreApp);
const RecentReportResource = new RecentReportResourceConstructor(coreApp);
// const ContentReportResource = new ContentReportResourceConstructor(coreApp);

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


function _showRecentReports(store, classId, channelId) {

}

/*
function redirectToDefaultReport(store, viewBy, classId, channelId) {
  const channelPromise = ChannelResource.getModel(channelId).fetch();

  channelPromise.then(
    (channelData) => {
      router.getInstance().replace({
        name: Constants.PageNames.TOPICS,
        params: {
          classId,
          channelId,
          contentScope: ReportConstants.ContentScopes.ROOT,
          contentScopeId: channelData.root_pk,
          userScope: ReportConstants.UserScopes.CLASSROOM,
          userScopeId: classId,
          allOrRecent: ReportConstants.AllOrRecent.ALL,
          viewBy: ReportConstants.ViewBy.CONTENT,
          sortColumn: ReportConstants.TableColumns.NAME,
          sortOrder: ReportConstants.SortOrders.NONE,
        },
      });
    },
    error => coreActions.handleError(store, error)
  );
}


function showReport(
  store,
  viewBy,
  classId,
  channelId,
  contentScope,
  contentScopeId,
  userScope,
  userScopeId,
  allOrRecent,
) {

  // REPORT
  const reportPayload = {
    channel_id: channelId,
    content_node_id: contentScopeId,
    collection_kind: userScope,
    collection_id: userScopeId,
  };
  let reportPromise;
  if (viewBy === ReportConstants.ViewBy.CONTENT) {
    reportPromise = ContentReportResource.getCollection(reportPayload).fetch();
  } else {
    reportPromise = UserReportResource.getCollection(reportPayload).fetch();
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
        allOrRecent,
        viewBy,
        tableData: report || {},
        contentScopeSummary: contentSummary,
        userScopeSummary: userSummary || {},
      };
      // store.dispatch('SET_PAGE_STATE', pageState);
    },
    error => coreActions.handleError(store, error)
  );
}
*/

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
            reports,
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
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  console.log('showRecentLearnersForItem');
}

function showRecentLearnerItemDetails(store, classId, channelId, contentId, userId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT_LEARNER_ITEM_DETAILS);
  store.dispatch('CORE_SET_TITLE', 'Recent - Learner Details');
  store.dispatch('CORE_SET_PAGE_LOADING', false);
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
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  console.log('showTopicChannelRoot');
}

function showTopicItemList(store, classId, channelId, topic) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPIC_ITEM_LIST);
  store.dispatch('CORE_SET_TITLE', 'Topics - Items');
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  console.log('showTopicItemList');
}

function showTopicLearnersForItem(store, classId, channelId, contentId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPIC_LEARNERS_FOR_ITEM);
  store.dispatch('CORE_SET_TITLE', 'Topics - Learners');
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  console.log('showTopicLearnersForItem');
}

function showTopicLearnerItemDetails(store, classId, channelId, contentId, userId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPIC_LEARNER_ITEM_DETAILS);
  store.dispatch('CORE_SET_TITLE', 'Topics - Learner Details');
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  console.log('showTopicLearnerItemDetails');
}

function showLearnerList(store, classId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.LEARNER_LIST);
  store.dispatch('CORE_SET_TITLE', 'Learners');
  store.dispatch('CORE_SET_PAGE_LOADING', false);
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
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  console.log('showLearnerChannelRoot');
}

function showLearnerItemList(store, classId, userId, channelId, topic) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.LEARNER_ITEM_LIST);
  store.dispatch('CORE_SET_TITLE', 'Learners - Items');
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  console.log('showLearnerItemList');
}

function showLearnerItemDetails(store, classId, userId, channelId, contentId) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.LEARNER_ITEM_DETAILS);
  store.dispatch('CORE_SET_TITLE', 'Learners - Item Details');
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  console.log('showLearnerItemDetails');
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
