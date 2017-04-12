
const Constants = require('../../constants');


/*
 * Generates a REPORTS location object relative to the
 * current page state, with only newParams changed.
 */
function genLink(pageState, newParams) {
  const currentParams = {
    classId: pageState.classId,
    channelId: pageState.channelId,
    contentScope: pageState.contentScope,
    contentScopeId: pageState.contentScopeId,
    userScope: pageState.userScope,
    userScopeId: pageState.userScopeId,
    allOrRecent: pageState.allOrRecent,
    viewBy: pageState.viewBy,
    sortColumn: pageState.sortColumn,
    sortOrder: pageState.sortOrder,
  };
  const vlink = {
    name: Constants.PageNames.REPORTS,
    params: {},
  };
  Object.assign(vlink.params, currentParams, newParams);
  return vlink;
}

module.exports = genLink;
