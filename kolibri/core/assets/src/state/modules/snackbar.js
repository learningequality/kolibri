export default {
  state: {
    isVisible: false,
    options: {
      text: '',
      autoDismiss: true,
    },
  },
  getters: {
    snackbarIsVisible(state) {
      return state.isVisible;
    },
    snackbarOptions(state) {
      return state.options;
    },
  },
  mutations: {
    CORE_CREATE_SNACKBAR(state, snackbarOptions = {}) {
      // reset
      state.isVisible = false;
      state.options = {};
      // set new options
      state.isVisible = true;
      // options include text, autoDismiss, duration, actionText, actionCallback,
      // hideCallback, bottomPosition
      state.options = snackbarOptions;
    },
    CORE_CLEAR_SNACKBAR(state) {
      state.isVisible = false;
      state.options = {};
    },
    CORE_SET_SNACKBAR_TEXT(state, text) {
      state.options.text = text;
    },
  },
};
