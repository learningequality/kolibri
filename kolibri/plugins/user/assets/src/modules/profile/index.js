import * as actions from './actions';

function defaultState() {
  return {
    busy: false,
    success: false,
    errors: false,
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
    SET_PROFILE_ERRORS(state, errors) {
      state.errors = errors;
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
