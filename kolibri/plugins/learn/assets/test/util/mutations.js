const Vue = require('vue');
const coreStore = require('kolibri.coreVue.vuex.store');

// parallel implemenation of mutations used for testing
const learnMutations = {
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
        Vue.set(state.examAttemptLogs, contentId, {});
      }
      Vue.set(state.examAttemptLogs, contentId,
        Object.assign(state.examAttemptLogs[contentId], examAttemptLogs[contentId]));
    });
  },
  SET_QUESTIONS_ANSWERED(state, questionsAnswered) {
    state.pageState.questionsAnswered = questionsAnswered;
  },
  LEARN_SET_MEMBERSHIPS(state, memberships) {
    state.learnAppState.memberships = memberships;
  }
};

module.exports = Object.assign(coreStore.mutations, learnMutations);
