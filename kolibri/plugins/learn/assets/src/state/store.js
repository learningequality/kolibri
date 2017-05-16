
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
  learnAppState: {
    memberships: []
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
    const newState = Object.assign({}, state.examAttemptLogs);
    Object.keys(examAttemptLogs).forEach(contentId => {
      if (!newState[contentId]) {
        newState[contentId] = {};
      }
      Object.assign(newState[contentId], examAttemptLogs[contentId]);
    });
    state.examAttemptLogs = newState;
  },
  SET_QUESTIONS_ANSWERED(state, questionsAnswered) {
    state.pageState.questionsAnswered = questionsAnswered;
  },
  LEARN_SET_MEMBERSHIPS(state, memberships) {
    state.learnAppState.memberships = memberships;
  }
};

// assigns core state and mutations
Object.assign(initialState, coreStore.initialState);
Object.assign(mutations, coreStore.mutations);


module.exports = new Vuex.Store({
  state: initialState,
  mutations,
});
