
const Constants = require('../../state/constants');


/*
 * This function automatically tweaks the 'view_by' parameter to avoid showing
 * a learner list view for a single user or a content list view for a single item.
 */
function _tweakViewByParam(params) {
  const singleUser = params.user_scope === Constants.UserScopes.USER;
  const singleItem = params.content_scope === Constants.ContentScopes.CONTENT;

  // no table is shown, so 'view_by' is ignored anyway
  if (singleUser && singleItem) {
    return;
  }

  // for 'single + multiple' cases, switch to the only compatible view
  if (singleUser) {
    params.view_by_content_or_learners = Constants.ViewBy.CONTENT;
  } else if (singleItem) {
    params.view_by_content_or_learners = Constants.ViewBy.LEARNERS;
  }
}


/*
 * Generates a REPORTS v-link object relative to the
 * current page state, with only newParams changed.
 */
function genLink(pageState, newParams) {
  const currentParams = {
    channel_id: pageState.channel_id,
    content_scope: pageState.content_scope,
    content_scope_id: pageState.content_scope_id,
    user_scope: pageState.user_scope,
    user_scope_id: pageState.user_scope_id,
    all_or_recent: pageState.all_or_recent,
    view_by_content_or_learners: pageState.view_by_content_or_learners,
    sort_column: pageState.sort_column,
    sort_order: pageState.sort_order,
  };
  const vlink = {
    name: Constants.PageNames.REPORTS,
    params: {},
  };
  Object.assign(vlink.params, currentParams, newParams);

  _tweakViewByParam(vlink.params);
  return vlink;
}

module.exports = genLink;
