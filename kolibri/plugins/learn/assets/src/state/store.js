
const constants = require('../constants');
const Vuex = require('kolibri.lib.vuex');
const coreStore = require('kolibri.coreVue.vuex.store');

const initialState = {
  pageName: constants.PageNames.EXPLORE_CHANNEL,
  pageState: {
    topics: [],
    contents: [],
    searchTerm: '',
  },
  examLog: {},
  examAttemptLogs: {},
};

const mutations = {
  SET_PAGE_NAME(state, name) {
    state.pageName = name;
  },
  SET_PAGE_STATE(state, pageState) {
    state.pageState = pageState;
  },
  SET_EXAM_LOG(state, examLog) {
    state.examLog = examLog;
  },
  SET_EXAM_ATTEMPT_LOGS(state, examAttemptLogs) {
    Object.keys(examAttemptLogs).forEach(contentId => {
      if (!state.examAttemptLogs[contentId]) {
        state.examAttemptLogs[contentId] = {};
      }
      Object.assign(state.examAttemptLogs[contentId], examAttemptLogs[contentId]);
    });
  }
};

// assigns core state and mutations
Object.assign(initialState, coreStore.initialState);
Object.assign(mutations, coreStore.mutations);


module.exports = new Vuex.Store({
  state: initialState,
  mutations,
});
