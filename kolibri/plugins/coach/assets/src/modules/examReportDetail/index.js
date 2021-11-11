// see getExamReport function for details on this object
function defaultState() {
  return {
    currentAttempt: {},
    currentInteraction: undefined,
    currentInteractionHistory: [],
    currentQuestion: {},
    exam: {},
    examAttempts: [],
    masteryLog: {},
    exercise: {},
    exerciseContentNodes: [],
    interactionIndex: 0,
    itemId: '',
    questionNumber: 0,
    questions: [],
    title: '',
    learnerId: null,
    pageTitle: '',
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
  },
};
