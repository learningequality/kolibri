import { PageNames } from '../constants';

export default {
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
