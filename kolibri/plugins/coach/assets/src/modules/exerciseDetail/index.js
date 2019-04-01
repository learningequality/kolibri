import * as actions from './actions';

function defaultState() {
  return {
    attemptId: null,
    attemptLogMap: {},
    exercise: {},
    interactionIndex: 0,
    summaryLog: {},
    learnerId: null,
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  actions,
  getters: {
    attemptLogs(state) {
      return Object.values(state.attemptLogMap).sort(
        (attemptLog1, attemptLog2) =>
          new Date(attemptLog2.end_timestamp) - new Date(attemptLog1.end_timestamp)
      );
    },
    attemptLogIndex(state, getters) {
      return getters.attemptLogs.findIndex(attemptLog => attemptLog.id === state.attemptId) || 0;
    },
    currentAttemptLog(state) {
      return state.attemptLogMap[state.attemptId] || {};
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
      const attemptLogMap = {};
      attemptLogs.forEach(attemptLog => {
        attemptLogMap[attemptLog.id] = attemptLog;
      });
      state.attemptLogMap = attemptLogMap;
    },
  },
};
