

// core state is namespaced, and merged with a particular app's state
const initialState = {
  core: {
    error: '',
    loading: true,
  },
};

const mutations = {
  CORE_SET_PAGE_LOADING(state, value) {
    state.core.loading = value;
  },
  CORE_SET_ERROR(state, error) {
    state.core.error = error;
  },
};

module.exports = {
  initialState,
  mutations,
};
