import { PageNames } from '../../src/constants';
import { initialState } from 'kolibri.coreVue.vuex.store';

// parallel implementation of initialState used in testing
const learnInitialState = {
  pageName: PageNames.TOPICS_CHANNEL,
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

const initState = Object.assign({}, learnInitialState, initialState);

export default initState;
