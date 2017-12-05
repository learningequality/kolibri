/**
 ** pageState schemas
 **/

export const initialState = {
  pageName: undefined,
  pageState: {},
  facility: undefined,
};

export const mutations = {
  SET_PAGE_NAME(state, name) {
    state.pageName = name;
  },
  SET_PAGE_STATE(state, pageState) {
    state.pageState = pageState;
  },
  // Profile Page Mutations
  SET_PROFILE_BUSY(state, isBusy) {
    state.pageState.busy = isBusy;
  },
  SET_PROFILE_SUCCESS(state, isSuccessful) {
    state.pageState.success = isSuccessful;
  },
  SET_PROFILE_ERROR(state, isError, errorMessage) {
    state.pageState.error = isError;
    state.pageState.errorMessage = errorMessage;
  },
  // Sign Up Page Mutations
  SET_SIGN_UP_BUSY(state, isBusy) {
    state.pageState.busy = isBusy;
  },
  SET_SIGN_UP_ERROR(state, errorCode, errorMessage) {
    state.pageState.errorCode = errorCode;
    state.pageState.errorMessage = errorMessage;
  },
};
