const router = require('kolibri.coreVue.router');
const PageNames = require('./state/constants').PageNames;


function showCoachRoot(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('SET_PAGE_NAME', 'COACH_ROOT');
}

function redirectToReportsQuery(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', 'REPORTS_ROOT');
  router.replace({
    name: PageNames.REPORTS_QUERY,
    params: {
      channel_id: 'channel_id',
      content_scope: 'root',
      content_scope_id: 'content_scope_id',
      user_scope: 'facility',
      user_scope_id: 'user_scope_id',
      all_or_recent: 'all',
      view_by_content_or_learners: 'content_view',
    },
  });

}

function showReportsQuery(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', 'REPORTS_QUERY');

  // Get Params
  const channelId = params.channel_id;
  const contentScope = params.content_scope;
  const contentScopeId = params.content_scope_id;
  const userScope = params.user_scope;
  const userScopeId = params.user_scope_id;
  const allOrRecent = params.all_or_recent;
  const viewByContentOrLearners = params.view_by_content_or_learners;

  // Valid Params
  const contentScopeOptions = ['root', 'topic', 'content'];
  const userScopeOptions = ['facility', 'class', 'group', 'learner'];
  const allOrRecentOptions = ['all', 'recent'];
  const viewByContentOrLearnersOptions = ['content_view', 'user_view'];


  // Check if params are valid
  if (!(contentScopeOptions.includes(contentScope)
    && userScopeOptions.includes(userScope)
    && allOrRecentOptions.includes(allOrRecent)
    && viewByContentOrLearnersOptions.includes(viewByContentOrLearners))) {
    console.log('Bad query.')
  } else {
    console.log('Valid query.');

  }

  store.dispatch('CORE_SET_PAGE_LOADING', false);
}

module.exports = {
  showCoachRoot,
  redirectToReportsQuery,
  showReportsQuery,
};
