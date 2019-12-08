import * as actions from './actions';

function defaultState() {
  return {
    id: null,
    name: null,
    parent: null,
    user_ids: [],
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
    SET_INDIVIDUAL_LEARNERS(state, payload) {
      Object.assign(state, payload);
    },
  },
  actions,
  getters: {
    hasAdHocLearnersAssigned(state) {
      return !!state.user_ids.length;
    },
  },
};
