import * as actions from './actions';

function defaultState() {
  return {
    busy: false,
    success: false,
    error: false,
    errorCode: null,
    errorMessage: '',
    passwordState: {
      modal: false,
      success: false,
      error: false,
      errorMessage: '',
    },
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
    SET_PROFILE_BUSY(state, isBusy) {
      state.busy = isBusy;
    },
    SET_PROFILE_SUCCESS(state, isSuccessful) {
      state.success = isSuccessful;
    },
    SET_PROFILE_ERROR(state, { isError, errorMessage = '', errorCode = null }) {
      state.error = isError;
      state.errorMessage = errorMessage;
      state.errorCode = errorCode;
    },
    SET_PROFILE_PASSWORD_MODAL(state, isVisible) {
      state.passwordState.modal = isVisible;
    },
    SET_PROFILE_PASSWORD_ERROR(state, { isError, errorMessage = '' }) {
      state.passwordState.error = isError;
      state.passwordState.errorMessage = errorMessage;
    },
  },
  actions,
};
