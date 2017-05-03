const constants = require('../constants');
const coreStore = require('kolibri.coreVue.vuex.store');

const learnInitialState = {
  pageName: constants.PageNames.EXPLORE_CHANNEL,
  pageState: {
    topics: [],
    contents: [],
    searchTerm: '',
  },
  learnAppState: {
    memberships: [],
  },
  examLog: {},
  examAttemptLogs: {},
};

module.exports = Object.assign(learnInitialState, coreStore.initialState);
