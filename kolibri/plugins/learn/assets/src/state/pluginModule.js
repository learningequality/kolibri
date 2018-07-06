import { PageNames } from '../constants';
import mutations from './mutations';
import * as getters from './getters';
import * as classesActions from './actions/classesActions';
import * as mainActions from './actions/main';
import * as recommendedActions from './actions/recommended';

export default {
  state: {
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
  },
  actions: {
    ...classesActions,
    ...mainActions,
    ...recommendedActions,
  },
  getters,
  mutations,
};
