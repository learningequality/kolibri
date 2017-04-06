const values = require('lodash.values');

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
function _showRecentChannels(store, classId) {
  function __getChannelLastActive(channel) {
    // helper function for _showRecentChannels
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
    channel => {
      channelLastActivePromises.push(__getChannelLastActive(channel));
    }
  );

  Promise.all(channelLastActivePromises).then(
    allChannelLastActive => {
      const lastActive = {};

      allChannelLastActive.forEach(
        channelLastActive => {
          Object.assign(lastActive, channelLastActive);
        }
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
        error => { coreActions.handleApiError(store, error); }
      );
    },
    error => { coreActions.handleApiError(store, error); }
  );
}


function showRecent(store, classId, channelId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT);
  // Handled by coach index
  // store.dispatch('CORE_SET_TITLE', 'Coach Recents');

  if (channelId) {
    _showRecentReports(store, classId, channelId);
  } else {
    _showRecentChannels(store, classId);
  }
}


function redirectToDefaultReport(store, viewBy, classId, channelId) {
  const channelPromise = ChannelResource.getModel(channelId).fetch();

  channelPromise.then(
    (channelData) => {
      router.getInstance().replace({
        name: Constants.PageNames.TOPICS,
        params: {
          class_id: classId,
          channel_id: channelId,
          content_scope: ReportConstants.ContentScopes.ROOT,
          content_scope_id: channelData.root_pk,
          user_scope: ReportConstants.UserScopes.CLASSROOM,
          user_scope_id: classId,
          all_or_recent: ReportConstants.AllOrRecent.ALL,
          view_by_content_or_learners: ReportConstants.ViewBy.CONTENT,
          sort_column: ReportConstants.TableColumns.NAME,
          sort_order: ReportConstants.SortOrders.NONE,
        },
      });
    },
    error => {
      coreActions.handleError(store, error);
    }
  );
}


function updateSorting(store, sortColumn, sortOrder) {
  store.dispatch('SET_SORT_COLUMN', sortColumn);
  store.dispatch('SET_SORT_ORDER', sortOrder);
}


function showReport(store, viewBy, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);

  const classId = params.class_id;
  const channelId = params.channel_id;
  const contentScope = params.content_scope;
  const contentScopeId = params.content_scope_id;
  const userScope = params.user_scope;
  const userScopeId = params.user_scope_id;
  const sortColumn = params.sort_column;
  const sortOrder = params.sort_order;

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
      // save URL params to store
      store.dispatch('SET_CLASS_ID', classId);
      store.dispatch('SET_CHANNEL_ID', channelId);
      store.dispatch('SET_CONTENT_SCOPE', contentScope);
      store.dispatch('SET_CONTENT_SCOPE_ID', contentScopeId);
      store.dispatch('SET_USER_SCOPE', userScope);
      store.dispatch('SET_USER_SCOPE_ID', userScopeId);
      store.dispatch('SET_ALL_OR_RECENT', ReportConstants.AllOrRecent.ALL);
      store.dispatch('SET_VIEW_BY_CONTENT_OR_LEARNERS', viewBy);
      store.dispatch('SET_SORT_COLUMN', sortColumn);
      store.dispatch('SET_SORT_ORDER', sortOrder);

      // save results of API request
      store.dispatch('SET_TABLE_DATA', report || {});
      store.dispatch('SET_CONTENT_SCOPE_SUMMARY', contentSummary);
      store.dispatch('SET_USER_SCOPE_SUMMARY', userSummary || {});

      // finih up
      store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPICS);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => { coreActions.handleError(store, error); }
  );
}


function showLearners(store) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.LEARNERS);
  store.dispatch('CORE_SET_PAGE_LOADING', false);
}


module.exports = {
  showRecent,
  redirectToDefaultReport,
  showReport,
  showLearners,
  updateSorting,
};
