import * as constants from '../../src/constants';
import * as coreStore from 'kolibri.coreVue.vuex.store';

// parallel implementation of initialState used in testing
const learnInitialState = {
  pageName: constants.PageNames.TOPICS_CHANNEL,
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

const initialState = Object.assign({}, learnInitialState, coreStore.initialState);

export default initialState;
