const values = require('lodash/values');

const coreApp = require('kolibri');
const coreActions = require('kolibri.coreVue.vuex.actions');
const router = require('kolibri.coreVue.router');

const Constants = require('../../constants');
const ReportConstants = require('../../reportConstants');

const RecentReportResourceConstructor = require('../../apiResources/recentReport');
const ContentReportResourceConstructor = require('../../apiResources/contentReport');
const UserReportResourceConstructor = require('../../apiResources/userReport');
const UserSummaryResourceConstructor = require('../../apiResources/userSummary');
const ContentSummaryResourceConstructor = require('../../apiResources/contentSummary');

const UserSummaryResource = new UserSummaryResourceConstructor(coreApp);
const UserReportResource = new UserReportResourceConstructor(coreApp);
const ContentSummaryResource = new ContentSummaryResourceConstructor(coreApp);
const RecentReportResource = new RecentReportResourceConstructor(coreApp);
const ContentReportResource = new ContentReportResourceConstructor(coreApp);

const ChannelResource = coreApp.resources.ChannelResource;


// helper function for showRecent, provides list of channels with recent activity
function showRecentChannels(store, classId) {
  function __getChannelLastActive(channel) {
    // helper function for showRecentChannels
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

  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT);

  const channelLastActivePromises = [];
  store.state.core.channels.list.forEach(
    channel => channelLastActivePromises.push(__getChannelLastActive(channel))
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


function showRecentReports(store, classId, channelId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT);
  // should be cached if navigated to this point
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


function updateSorting(store, sortColumn, sortOrder) {
  store.dispatch('SET_REPORT_SORTING', sortColumn, sortOrder);
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
  sortColumn,
  sortOrder
) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);

  /* check if params are semi-valid. */
  function _validate(value, constants) {
    if (!values(constants).includes(value)) {
      throw Error(`Invalid report parameters: ${value} not in ${JSON.stringify(constants)}`);
    }
  }
  _validate(contentScope, ReportConstants.ContentScopes);
  _validate(userScope, ReportConstants.UserScopes);
  _validate(viewBy, ReportConstants.ViewBy);
  _validate(sortColumn, ReportConstants.TableColumns);
  _validate(sortOrder, ReportConstants.SortOrders);

  if (
    userScope === ReportConstants.UserScopes.USER &&
    contentScope === ReportConstants.ContentScopes.CONTENT
  ) {
    throw Error('One user, one content - show exercise?');
  }

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
        sortColumn,
        sortOrder,
        tableData: report || {},
        contentScopeSummary: contentSummary,
        userScopeSummary: userSummary || {},
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPICS);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => coreActions.handleError(store, error)
  );
}



module.exports = {
  showRecentReports,
  showRecentChannels,
  redirectToDefaultReport,
  showReport,
  updateSorting,
};
