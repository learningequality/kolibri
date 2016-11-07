const router = require('kolibri.coreVue.router');
const coreActions = require('kolibri.coreVue.vuex.actions');
const PageNames = require('./state/constants').PageNames;
const ReportsOptions = require('./state/constants').ReportsOptions;


function showCoachRoot(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('SET_PAGE_NAME', 'COACH_ROOT');
}


function redirectToDefaultReports(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', 'REPORTS_NO_QUERY');

  // if necessary query server root topic PK
  // TODO: Get channel id, root id, and facility id.
  const channelId = 'channel_id';
  const contentScopeId = 'root_id';
  const userScopeId = 'facility_id';

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
}


function showReports(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', 'REPORTS');

  // Get params.
  // const channelId = params.channel_id;
  const contentScope = params.content_scope;
  // const contentScopeId = params.content_scope_id;
  const userScope = params.user_scope;
  // const userScopeId = params.user_scope_id;
  const allOrRecent = params.all_or_recent;
  const viewByContentOrLearners = params.view_by_content_or_learners;
  const sortColumn = params.sort_column;
  const sortOrder = params.sort_order;


  // Check if params are valid.
  if (!(ReportsOptions.CONTENT_SCOPE_OPTIONS.includes(contentScope)
    && ReportsOptions.USER_SCOPE_OPTIONS.includes(userScope)
    && ReportsOptions.ALL_OR_RECENT_OPTIONS.includes(allOrRecent)
    && ReportsOptions.VIEW_BY_CONTENT_OR_LEARNERS_OPTIONS.includes(viewByContentOrLearners)
    && ReportsOptions.SORT_COLUMN_OPTIONS.includes(sortColumn)
    && ReportsOptions.SORT_ORDER_OPTIONS.includes(sortOrder))) {
    // If invalid query, just throw error.
    coreActions.handleError(store, 'Invalid query. Redirected to a valid query.');
  } else {
    console.log('Valid query.');
  }

  store.dispatch('CORE_SET_PAGE_LOADING', false);


  // populate vuex already in URL
  // dispatch ...


  // resource fetch to summary and list endpoints
  // on then:
  //   dispatch...


  // possible new resources:
  /* UserSummaryReport.getModel({
   })

   ContentSummaryReport.getModel({
   })

   ContentReport.getCollection({
   })

   UserReport.getCollection({
   })*/
}


module.exports = {
  showCoachRoot,
  redirectToDefaultReports,
  showReports,
};
