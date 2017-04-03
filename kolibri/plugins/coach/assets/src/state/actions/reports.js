const values = require('lodash.values');

const coreApp = require('kolibri');
const coreActions = require('kolibri.coreVue.vuex.actions');
const logging = require('kolibri.lib.logging');
const router = require('kolibri.coreVue.router');
const getDefaultChannelId = require('kolibri.coreVue.vuex.getters').getDefaultChannelId;
const ConditionalPromise = require('kolibri.lib.conditionalPromise');

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
const FacilityUserResource = coreApp.resources.FacilityUserResource;


function _showRecentChannels(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT);
  const channelPromise = ChannelResource.getCollection();
  channelPromise.fetch().then(
    channels => {
      const pageState = {
        channels,
        classId,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', 'Recents');
    },
    error => { coreActions.handleApiError(store, error); }
  );
}


function _showRecentReports(store, classId, channelId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT);

  // should be cached if navigated to this point
  const channelPromise = ChannelResource.getModel(channelId).fetch();

  channelPromise.then(
    channelData => {
      const reportPayload = {
        channel_id: channelId,
        content_node_id: channelData.root_pk,
        collection_kind: ReportConstants.UserScopes.CLASSROOM,
        collection_id: classId,
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
  if (channelId) {
    _showRecentReports(store, classId, channelId);
  } else {
    _showRecentChannels(store, classId);
  }
}


function redirectToChannelReport(store, params) {
  const channelId = params.channel_id;
  const channelListPromise = ChannelResource.getCollection().fetch();

  ConditionalPromise.all([channelListPromise]).only(
    coreActions.samePageCheckGenerator(store),
    ([channelList]) => {
      if (!(channelList.some((channel) => channel.id === channelId))) {
        router.getInstance().replace({ name: Constants.PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      coreActions.setChannelInfo(store, channelId).then(
        () => {
          router.getInstance().replace({ name: Constants.PageNames.REPORTS_NO_QUERY });
        }
      );
    },
    error => {
      coreActions.handleError(store, error);
    }
  );
}


function redirectToDefaultReport(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.REPORTS_NO_QUERY);

  const channelListPromise = ChannelResource.getCollection().fetch();
  const facilityIdPromise = FacilityUserResource.getCurrentFacility();

  ConditionalPromise.all([channelListPromise, facilityIdPromise]).only(
    coreActions.samePageCheckGenerator(store),
    ([channelList, facilityId]) => {
      // If no channels exist
      if (channelList.length === 0) {
        router.getInstance().replace({ name: Constants.PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      /* get current channelId */
      const channelId = getDefaultChannelId(channelList);

      /* get contentScopeId for root */
      const contentScopeId = channelList.find((channel) => channel.id === channelId).root_pk;

      /* get userScopeId for facility */
      const userScopeId = facilityId[0];
      router.getInstance().replace({
        name: Constants.PageNames.REPORTS,
        params: {
          channel_id: channelId,
          content_scope: ReportConstants.ContentScopes.ROOT,
          content_scope_id: contentScopeId,
          user_scope: ReportConstants.UserScopes.FACILITY,
          user_scope_id: userScopeId,
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


/* find the keys that differ between the old and new params */
function _diffKeys(newParams, oldParams) {
  if (!oldParams) {
    return Object.keys(newParams);
  }
  const diffKeys = [];
  Object.entries(newParams).forEach(([key, value]) => {
    if (oldParams[key] !== value) {
      diffKeys.push(key);
    }
  });
  return diffKeys;
}


function showReport(store, params, oldParams) {
  /* get params from url. */
  const channelId = params.channel_id;
  const contentScope = params.content_scope;
  const contentScopeId = params.content_scope_id;
  const userScope = params.user_scope;
  const userScopeId = params.user_scope_id;
  const allOrRecent = params.all_or_recent;
  const viewByContentOrLearners = params.view_by_content_or_learners;
  const sortColumn = params.sort_column;
  const sortOrder = params.sort_order;


  /* check if params are semi-valid. */
  if (!(values(Constants.ContentScopes).includes(contentScope)
    && values(Constants.UserScopes).includes(userScope)
    && values(Constants.AllOrRecent).includes(allOrRecent)
    && values(Constants.ViewBy).includes(viewByContentOrLearners)
    && values(Constants.TableColumns).includes(sortColumn)
    && values(Constants.SortOrders).includes(sortOrder))) {
    /* if invalid params, just throw an error. */
    coreActions.handleError(store, 'Invalid report parameters.');
    return;
  }

  const diffKeys = _diffKeys(params, oldParams);

  store.dispatch('SET_PAGE_NAME', Constants.PageNames.REPORTS);

  // these don't require updates from the server
  const localUpdateParams = ['sort_column', 'sort_order'];
  if (diffKeys.every(key => localUpdateParams.includes(key))) {
    store.dispatch('SET_SORT_COLUMN', sortColumn);
    store.dispatch('SET_SORT_ORDER', sortOrder);
    return;
  }

  const promises = [];

  const reportPayload = {
    channel_id: channelId,
    content_node_id: contentScopeId,
    collection_kind: userScope,
    collection_id: userScopeId,
  };

  // REPORT
  let reportPromise;
  if (!(userScope === Constants.UserScopes.USER &&
    contentScope === Constants.ContentScopes.CONTENT)) {
    if (allOrRecent === Constants.AllOrRecent.RECENT) {
      reportPromise = RecentReportResource.getCollection(reportPayload).fetch();
    } else if (viewByContentOrLearners === Constants.ViewBy.CONTENT) {
      reportPromise = ContentReportResource.getCollection(reportPayload).fetch();
    } else if (viewByContentOrLearners === Constants.ViewBy.LEARNERS) {
      reportPromise = UserReportResource.getCollection(reportPayload).fetch();
    } else {
      logging.error('unhandled input parameters');
    }
  }

  promises.push(reportPromise);


  // CONTENT SUMMARY
  const contentPromise = ContentSummaryResource.getModel(contentScopeId, reportPayload).fetch();
  promises.push(contentPromise);

  // USER SUMMARY
  let userPromise;
  if (userScope === Constants.UserScopes.USER) {
    userPromise = UserSummaryResource.getModel(userScopeId, reportPayload).fetch();
  }
  promises.push(userPromise);

  // CHANNELS
  const channelPromise = coreActions.setChannelInfo(store);
  promises.push(channelPromise);

  // API response handlers
  Promise.all(promises).then(([report, contentSummary, userSummary]) => {
    // save URL params to store
    store.dispatch('SET_CHANNEL_ID', channelId);
    store.dispatch('SET_CONTENT_SCOPE', contentScope);
    store.dispatch('SET_CONTENT_SCOPE_ID', contentScopeId);
    store.dispatch('SET_USER_SCOPE', userScope);
    store.dispatch('SET_USER_SCOPE_ID', userScopeId);
    store.dispatch('SET_ALL_OR_RECENT', allOrRecent);
    store.dispatch('SET_VIEW_BY_CONTENT_OR_LEARNERS', viewByContentOrLearners);
    store.dispatch('SET_SORT_COLUMN', sortColumn);
    store.dispatch('SET_SORT_ORDER', sortOrder);

    // save results of API request
    store.dispatch('SET_TABLE_DATA', report || {});
    store.dispatch('SET_CONTENT_SCOPE_SUMMARY', contentSummary);
    store.dispatch('SET_USER_SCOPE_SUMMARY', userSummary || {});
    store.dispatch('CORE_SET_PAGE_LOADING', false);

    const titleElems = ['Coach Reports'];
    if (userScope === Constants.UserScopes.USER) {
      titleElems.push(`${userSummary.full_name}`);
    } else if (userScope === Constants.UserScopes.FACILITY) {
      titleElems.push('All learners');
    }
    titleElems.push(`${contentSummary.title}`);
    if (allOrRecent === Constants.AllOrRecent.RECENT) {
      titleElems.push('Recent');
    } else if (viewByContentOrLearners === Constants.ViewBy.CONTENT) {
      titleElems.push('Contents');
    } else if (viewByContentOrLearners === Constants.ViewBy.LEARNERS) {
      titleElems.push('Learners');
    }
    store.dispatch('CORE_SET_TITLE', titleElems.join(' - '));
  },
    error => { coreActions.handleError(store, error); }
  );
}


function showTopics(store) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPICS);
  store.dispatch('CORE_SET_PAGE_LOADING', false);
}


function showLearners(store) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.LEARNERS);
  store.dispatch('CORE_SET_PAGE_LOADING', false);
}


module.exports = {
  showRecent,
  redirectToChannelReport,
  redirectToDefaultReport,
  showReport,
  showTopics,
  showLearners,
};
