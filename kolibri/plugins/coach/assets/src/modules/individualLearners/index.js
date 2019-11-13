import * as actions from './actions';

function defaultState() {
  return {
    classId: '',
    individualLearners: [],
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
      state.individualLearners = payload;
    },
  },
  actions,
};
