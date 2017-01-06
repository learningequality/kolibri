
const Constants = require('./constants');


function activeManage(state) {
  const managePages = [
    Constants.PageNames.USER_MGMT_PAGE,
    Constants.PageNames.CONTENT_MGMT_PAGE,
    Constants.PageNames.DATA_EXPORT_PAGE,
    Constants.PageNames.SCRATCHPAD,
  ];
  if (managePages.some(page => page === state.pageName)) {
    return true;
  }
  return false;
}


module.exports = {
  activeManage,
};
