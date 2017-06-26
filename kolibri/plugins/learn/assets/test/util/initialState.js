import constants from '../../src/constants';
import coreStore from 'kolibri.coreVue.vuex.store';

// parallel implementation of initialState used in testing
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
