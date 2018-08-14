import * as actions from './actions';

function defaultState() {
  return {
    attemptLogIndex: 0,
    attemptLogs: [],
    channelId: '',
    exercise: {},
    interactionIndex: 0,
    summaryLog: {},
    user: {},
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  actions,
  getters: {
    currentAttemptLog(state) {
      return state.attemptLogs[state.attemptLogIndex] || {};
    },
    currentInteraction(state, getters) {
      return getters.currentInteractionHistory[state.interactionIndex];
    },
    currentInteractionHistory(state, getters) {
      let history = getters.currentAttemptLog.interaction_history || [];
      // filter out interactions without answers but keep hints and errors
      history = history.filter(interaction =>
        Boolean(interaction.answer || interaction.type === 'hint' || interaction.type === 'error')
      );
      return history;
    },
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    SET_ATTEMPT_LOGS(state, attemptLogs) {
      state.attemptLogs = [...attemptLogs];
    },
  },
};
