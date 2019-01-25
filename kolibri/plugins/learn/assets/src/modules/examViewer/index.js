import * as actions from './actions';

function defaultState() {
  return {
    content: {},
    currentAttempt: {},
    currentQuestion: {},
    exam: {},
    itemId: '',
    questionNumber: 0,
    questions: [],
    questionsAnswered: 0,
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    SET_CURRENT_ATTEMPT_LOG(state, currentAttempt) {
      state.currentAttempt = currentAttempt;
    },
    SET_QUESTIONS_ANSWERED(state, questionsAnswered) {
      state.questionsAnswered = questionsAnswered;
    },
  },
  actions,
};
