function defaultState() {
  return {
    attemptLogIndex: 0,
    attemptLogs: [],
    channelId: '',
    currentAttemptLog: {},
    currentInteraction: {},
    currentInteractionHistory: [],
    exercise: {},
    interactionIndex: 0,
    summaryLog: {},
    user: {},
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
