import * as actions from './actions';

function defaultState() {
  return {
    busy: false,
    errors: [],
    unrecognizedError: false,
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
    SET_SIGN_UP_BUSY(state, busy) {
      state.busy = busy;
    },
    SET_SIGN_UP_ERRORS(state, errors) {
      state.errors = errors;
    },
    SET_SIGN_UP_UNRECOGNIZED_ERROR(state) {
      state.unrecognizedError = true;
    },
  },
  actions,
};
