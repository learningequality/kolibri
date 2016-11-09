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

const PageNames = require('./state/constants').PageNames;
const ReportsOptions = require('./state/constants').ReportsOptions;


function showCoachRoot(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('SET_PAGE_NAME', 'COACH_ROOT');
}


function redirectToDefaultReports(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', 'REPORTS_NO_QUERY');

  const channelListPromise = ChannelResource.getCollection({}).fetch();
  const facilityIdPromise = FacilityUserResource.getCurrentFacility();

  ConditionalPromise.all([channelListPromise, facilityIdPromise]).only(
    coreActions.samePageCheckGenerator(store),
    ([channelList, facilityId]) => {
      /* get current channelId */
      const channelId = getDefaultChannelId(channelList);

      /* get contentScopeId for root */
      let contentScopeId = null;
      for (let x = 0; x < channelList.length; x++) {
        if (channelList[x].id === channelId) {
          contentScopeId = channelList[x].root_pk;
        }
      }

      /* get userScopeId for facility */
      const userScopeId = facilityId[0];
      router.replace({
        name: PageNames.REPORTS,
        params: {
          channel_id: channelId,
          content_scope: ReportsOptions.CONTENT_SCOPE_OPTIONS[0],
          content_scope_id: contentScopeId,
          user_scope: ReportsOptions.USER_SCOPE_OPTIONS[0],
          user_scope_id: userScopeId,
          all_or_recent: ReportsOptions.ALL_OR_RECENT_OPTIONS[0],
          view_by_content_or_learners: ReportsOptions.VIEW_BY_CONTENT_OR_LEARNERS_OPTIONS[0],
          sort_column: ReportsOptions.SORT_COLUMN_OPTIONS[0],
          sort_order: ReportsOptions.SORT_ORDER_OPTIONS[0],
        },
      });
    },

    error => {
      coreActions.handleError(store, error);
    }
  );
}

function showReports(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true); // does this even work since I didn't implement it?
  store.dispatch('SET_PAGE_NAME', 'REPORTS');

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
  if (!(ReportsOptions.CONTENT_SCOPE_OPTIONS.includes(contentScope)
    && ReportsOptions.USER_SCOPE_OPTIONS.includes(userScope)
    && ReportsOptions.ALL_OR_RECENT_OPTIONS.includes(allOrRecent)
    && ReportsOptions.VIEW_BY_CONTENT_OR_LEARNERS_OPTIONS.includes(viewByContentOrLearners)
    && ReportsOptions.SORT_COLUMN_OPTIONS.includes(sortColumn)
    && ReportsOptions.SORT_ORDER_OPTIONS.includes(sortOrder))) {
    /* if invalid params, just throw an error. */
    coreActions.handleError(store, 'Invalid report parameters.');
    return;
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


  /* GET AND SET TABLE DATA */
  /* check what kind of report is required */
  let reportResourceType;
  if (allOrRecent === 'recent') {
    reportResourceType = RecentReportResource;
  } else if (viewByContentOrLearners === 'content_view') {
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
  if (userScope === 'user') {
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
}


module.exports = {
  showCoachRoot,
  redirectToDefaultReports,
  showReports,
};
