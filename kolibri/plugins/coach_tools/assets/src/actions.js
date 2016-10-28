// ================================
// COACH ACTIONS

function initializePage(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('SET_PAGE_NAME', 'HOME');
}

function showScratchpad(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('SET_PAGE_NAME', 'SCRATCHPAD');
}

function showReports(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', 'REPORTS');

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
}

module.exports = {
  initializePage,
  showScratchpad,
  showReports,
};
