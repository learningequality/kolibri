export default {
  CORE_SET_PAGE_LOADING(state, value) {
    state.loading = value;
  },
  CORE_SET_ERROR(state, error) {
    state.error = error;
  },
  CORE_SET_PAGE_VISIBILITY(state, visible) {
    state.pageVisible = visible;
  },
};
