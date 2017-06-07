const types = require('./manageContentActions').actionTypes;
const { PageNames } = require('../constants');

function isManageContentPage(state) {
  return state.pageName === PageNames.CONTENT_MGMT_PAGE;
}

module.exports = {
  [types.ADD_CHANNEL_FILE_SUMMARY](state, fileSummary) {
    if (isManageContentPage(state)) {
      state.pageState.channelFileSummaries[fileSummary.channel_id] = fileSummary;
    }
  }
};
