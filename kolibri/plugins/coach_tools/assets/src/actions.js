const router = require('kolibri.coreVue.router');
const PageNames = require('./state/constants').PageNames;
const coreActions = require('kolibri.coreVue.vuex.actions');


// Valid options
const CONTENT_SCOPE_OPTIONS = ['root', 'topic', 'content'];
const USER_SCOPE_OPTIONS = ['facility', 'classroom', 'learnergroup', 'user'];
const ALL_OR_RECENT_OPTIONS = ['all', 'recent'];
const VIEW_BY_CONTENT_OR_LEARNERS_OPTIONS = ['content_view', 'user_view'];


function showCoachRoot(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('SET_PAGE_NAME', 'COACH_ROOT');
}


function redirectToDefaultReports(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', 'REPORTS_NO_QUERY');

  // TODO: Get channel id, root id, and facility id.
  const channelId = 'channel_id';
  const contentScopeId = 'root_id';
  const userScopeId = 'facility_id';

  // if necessary query server root topic PK

  router.replace({
    name: PageNames.REPORTS,
    params: {
      channel_id: channelId,
      content_scope: CONTENT_SCOPE_OPTIONS[0],
      content_scope_id: contentScopeId,
      user_scope: USER_SCOPE_OPTIONS[0],
      user_scope_id: userScopeId,
      all_or_recent: ALL_OR_RECENT_OPTIONS[0],
      view_by_content_or_learners: VIEW_BY_CONTENT_OR_LEARNERS_OPTIONS[0],
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


  // Check if params are valid.
  if (!(CONTENT_SCOPE_OPTIONS.includes(contentScope)
    && USER_SCOPE_OPTIONS.includes(userScope)
    && ALL_OR_RECENT_OPTIONS.includes(allOrRecent)
    && VIEW_BY_CONTENT_OR_LEARNERS_OPTIONS.includes(viewByContentOrLearners))) {
    // If incorrect redirect to default reports.
    coreActions.handleError(store, 'Invalid query. Redirected to a valid query.');
    console.log('Invalid query.');
    redirectToDefaultReports(store, params);
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
