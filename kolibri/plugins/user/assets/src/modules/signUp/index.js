import * as actions from './actions';

function defaultState() {
  return {
    busy: false,
    errorCode: null,
    errorMessage: '',
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
    SET_SIGN_UP_ERROR(state, { errorCode, errorMessage = '' }) {
      state.errorCode = errorCode;
      state.errorMessage = errorMessage;
    },
  },
  actions,
};
