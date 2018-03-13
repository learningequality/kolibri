export default {
  SET_PAGE_NAME(state, name) {
    state.pageName = name;
  },
  SET_PAGE_STATE(state, pageState) {
    state.pageState = pageState;
  },
  SET_FACILITY_ID(state, facilityId) {
    state.facilityId = facilityId;
  },
  // Profile Page Mutations
  SET_PROFILE_BUSY(state, isBusy) {
    state.pageState.busy = isBusy;
  },
  SET_PROFILE_SUCCESS(state, isSuccessful) {
    state.pageState.success = isSuccessful;
  },
  SET_PROFILE_ERROR(state, { isError, errorMessage = '', errorCode = null }) {
    state.pageState.error = isError;
    state.pageState.errorMessage = errorMessage;
    state.pageState.errorCode = errorCode;
  },
  SET_PROFILE_PASSWORD_MODAL(state, isVisible) {
    state.pageState.passwordState.modal = isVisible;
  },
  SET_PROFILE_PASSWORD_ERROR(state, { isError, errorMessage = '' }) {
    state.pageState.passwordState.error = isError;
    state.pageState.passwordState.errorMessage = errorMessage;
  },
  // Sign Up Page Mutations
  SET_SIGN_UP_BUSY(state, isBusy) {
    state.pageState.busy = isBusy;
  },
  SET_SIGN_UP_ERROR(state, { errorCode, errorMessage = '' }) {
    state.pageState.errorCode = errorCode;
    state.pageState.errorMessage = errorMessage;
  },
  RESET_PROFILE_STATE(state) {
    state.pageState = {
      busy: false,
      success: false,
      error: false,
      errorCode: null,
      errorMessage: '',
      passwordState: {
        modal: false,
        success: false,
        error: false,
      },
    };
  },
  RESET_SIGN_UP_STATE(state) {
    state.pageState = {
      busy: false,
      errorCode: null,
      errorMessage: '',
    };
  },
};
