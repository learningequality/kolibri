const router = require('kolibri.coreVue.router');
const coreActions = require('kolibri.coreVue.vuex.actions');
const getDefaultChannelId = require('kolibri.coreVue.vuex.getters').getDefaultChannelId;
const ConditionalPromise = require('kolibri.lib.conditionalPromise');

const ContentSummaryResource = require('kolibri').resources.ContentSummaryResource;
const UserSummaryResource = require('kolibri').resources.UserSummaryResource;
const ContentReportResource = require('kolibri').resources.ContentReportResource;
const UserReportResource = require('kolibri').resources.UserReportResource;
const RecentReportResource = require('kolibri').resources.RecentReportResource;

const ChannelResource = require('kolibri').resources.ChannelResource;
const FacilityUserResource = require('kolibri').resources.FacilityUserResource;
const Constants = require('./state/constants');

const logging = require('kolibri.lib.logging');


/* returns an array of the values of an object */
function _vals(obj) {
  return Object.entries(obj).map(([key, value]) => value);
}


/* Only certain types of parameter updates require the 'loading' flag to be set */
function _useReportPageLoadingFlag(newParams, oldParams) {
  if (!newParams || !oldParams) {
    return true;
  }
  if (Object.entries(newParams).length !== Object.entries(newParams).length) {
    return true;
  }
  const diffKeys = [];
  Object.entries(newParams).forEach(([key, value]) => {
    if (oldParams[key] !== value) {
      diffKeys.push(key);
    }
  });
  if (diffKeys.length > 1) {
    return true;
  }
  const noLoadingParams = [
    'view_by_content_or_learners',
    'sort_column',
    'sort_order',
  ];
  return !noLoadingParams.includes(diffKeys[0]);
}


function showCoachRoot(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.COACH_ROOT);
}


function redirectToDefaultReport(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.REPORTS_NO_QUERY);

  const channelListPromise = ChannelResource.getCollection({}).fetch();
  const facilityIdPromise = FacilityUserResource.getCurrentFacility();

  ConditionalPromise.all([channelListPromise, facilityIdPromise]).only(
    coreActions.samePageCheckGenerator(store),
    ([channelList, facilityId]) => {
      /* get current channelId */
      const channelId = getDefaultChannelId(channelList);

      /* get contentScopeId for root */
      const contentScopeId = channelList.find((channel) => channel.id === channelId).root_pk;

      /* get userScopeId for facility */
      const userScopeId = facilityId[0];
      router.replace({
        name: Constants.PageNames.REPORTS,
        params: {
          channel_id: channelId,
          content_scope: Constants.ContentScopes.ROOT,
          content_scope_id: contentScopeId,
          user_scope: Constants.UserScopes.FACILITY,
          user_scope_id: userScopeId,
          all_or_recent: Constants.AllOrRecent.ALL,
          view_by_content_or_learners: Constants.ViewBy.CONTENT,
          sort_column: Constants.SortCols.NAME,
          sort_order: Constants.SortOrders.DESC,
        },
      });
    },

    error => {
      coreActions.handleError(store, error);
    }
  );
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
  if (!(_vals(Constants.ContentScopes).includes(contentScope)
    && _vals(Constants.UserScopes).includes(userScope)
    && _vals(Constants.AllOrRecent).includes(allOrRecent)
    && _vals(Constants.ViewBy).includes(viewByContentOrLearners)
    && _vals(Constants.SortCols).includes(sortColumn)
    && _vals(Constants.SortOrders).includes(sortOrder))) {
    /* if invalid params, just throw an error. */
    coreActions.handleError(store, 'Invalid report parameters.');
    return;
  }

  store.dispatch('SET_PAGE_NAME', Constants.PageNames.REPORTS);

  if (_useReportPageLoadingFlag(params, oldParams)) {
    store.dispatch('CORE_SET_PAGE_LOADING', true);
  }

  /* save all params to store. */
  store.dispatch('SET_CHANNEL_ID', channelId);
  store.dispatch('SET_CONTENT_SCOPE', contentScope);
  store.dispatch('SET_CONTENT_SCOPE_ID', contentScopeId);
  store.dispatch('SET_USER_SCOPE', userScope);
  store.dispatch('SET_USER_SCOPE_ID', userScopeId);
  store.dispatch('SET_ALL_OR_RECENT', allOrRecent);
  store.dispatch('SET_VIEW_BY_CONTENT_OR_LEARNERS', viewByContentOrLearners);
  store.dispatch('SET_SORT_COLUMN', sortColumn);
  store.dispatch('SET_SORT_ORDER', sortOrder);


  /* resource-layer work-around below */
  const resourcePromise = require('./resourcePromise');
  const URL_ROOT = '/coach/api';
  const promises = [];

  // REPORT
  let reportUrl = `${URL_ROOT}/${channelId}/${contentScopeId}/${userScope}/${userScopeId}`;
  if (allOrRecent === Constants.AllOrRecent.RECENT) {
    reportUrl += '/recentreport/';
  } else if (viewByContentOrLearners === Constants.ViewBy.CONTENT) {
    reportUrl += '/contentreport/';
  } else if (viewByContentOrLearners === Constants.ViewBy.LEARNERS) {
    reportUrl += '/userreport/';
  } else {
    logging.error('unhandled input parameters');
  }
  promises.push(resourcePromise(reportUrl));

  // CONTENT SUMMARY
  const contentSummaryUrl =
    `${URL_ROOT}/${channelId}/${userScope}/${userScopeId}/contentsummary/${contentScopeId}/`;
  promises.push(resourcePromise(contentSummaryUrl));

  // USER SUMMARY
  if (userScope === Constants.UserScopes.USER) {
    const userSummaryUrl
      = `${URL_ROOT}/${channelId}/${contentScopeId}/usersummary/${userScopeId}/`;
    promises.push(resourcePromise(userSummaryUrl));
  } else {
    promises.push({});
  }

  // API response handlers
  Promise.all(promises).then(([report, contentSummary, userSummary]) => {
    store.dispatch('SET_TABLE_DATA', report);
    store.dispatch('SET_CONTENT_SCOPE_SUMMARY', contentSummary);
    store.dispatch('SET_USER_SCOPE_SUMMARY', userSummary);
    store.dispatch('CORE_SET_PAGE_LOADING', false);

    const titleElems = ['Coach Reports'];
    if (userScope === Constants.UserScopes.USER) {
      titleElems.push(`${userSummary.full_name}`);
    } else if (userScope === Constants.UserScopes.FACILITY) {
      titleElems.push('All Learners');
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

  return;
  /* resource-layer work-around above */

  /* eslint-disable */

  /* GET AND SET TABLE DATA */
  /* check what kind of report is required */
  let reportResourceType;
  if (allOrRecent === Constants.AllOrRecent.RECENT) {
    reportResourceType = RecentReportResource;
  } else if (viewByContentOrLearners === Constants.ViewBy.CONTENT) {
    reportResourceType = ContentReportResource;
  } else {
    reportResourceType = UserReportResource;
  }

  /* get the report */
  const reportPromise = reportResourceType.getCollection({
    channel_id: channelId,
    content_node_id: contentScopeId,
    collection_kind: userScope,
    collection_id: userScopeId,
  }).fetch();

  /* set the table data in the store */
  ConditionalPromise.all([reportPromise]).only(
    coreActions.samePageCheckGenerator(store),
    ([report]) => {
      console.log(report);
      store.dispatch('SET_TABLE_DATA', report);
    },
    error => {
      coreActions.handleError(store, error);
    }
  );

  /* GET AND SET SUMMARIES */
  /* get the content summary */
  const contentSummaryPromise = ContentSummaryResource.getCollection({
    channel_id: channelId,
    collection_kind: userScope,
    collection_id: userScopeId,
    topic_pk: contentScopeId,
  }).fetch();

  /* set the content summary in the store */
  ConditionalPromise.all([contentSummaryPromise]).only(
    coreActions.samePageCheckGenerator(store),
    ([contentSummary]) => {
      console.log(contentSummary);
      store.dispatch('SET_CONTENT_SCOPE_SUMMARY', contentSummary);
    },
    error => {
      coreActions.handleError(store, error);
    }
  );

  /* check if a user summary is required */
  if (userScope === Constants.UserScopes.USER) {
    /* get the user summary */
    const userSummaryPromise = UserSummaryResource.getCollection({
      channel_id: channelId,
      content_node_id: contentScopeId,
      user_pk: userScopeId,
    }).fetch();

    /* set the user summary in the store */
    ConditionalPromise.all([userSummaryPromise]).only(
      coreActions.samePageCheckGenerator(store),
      ([userSummary]) => {
        console.log(userSummary);
        store.dispatch('SET_USER_SCOPE_SUMMARY', userSummary);
      },
      error => {
        coreActions.handleError(store, error);
      }
    );
  }

  store.dispatch('CORE_SET_PAGE_LOADING', false);
  /* eslint-enable */
}

module.exports = {
  showCoachRoot,
  redirectToDefaultReport,
  showReport,
};
