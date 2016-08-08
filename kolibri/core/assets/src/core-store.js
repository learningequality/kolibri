

const UserKinds = require('./constants').UserKinds;

// core state is namespaced, and merged with a particular app's state
const initialState = {
  core: {
    error: '',
    loading: true,
    session: { kind: UserKinds.ANONYMOUS },
  },
};

const mutations = {
  CORE_SET_SESSION(state, value) {
    state.core.session = value;
    console.log('state.core.session: ', state.core.session);
  },
  CORE_CLEAR_SESSION(state) {
    state.core.session = { kind: UserKinds.ANONYMOUS };
  },
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
