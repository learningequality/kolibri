

const UserKinds = require('./constants').UserKinds;

// core state is namespaced, and merged with a particular app's state
const initialState = {
  core: {
    error: '',
    loading: true,
    session: {
      kind: UserKinds.ADMIN,
      facility_id: '1',
      user_id: '2',
      username: 'starchy52',
      fullname: 'Mr. Potato Head',
    },
  },
};

const mutations = {
  CORE_SET_SESSION(state, value) {
    state.core.session = value;
  },
  CORE_CLEAR_SESSION(state) {
    state.core.session = {
      kind: UserKinds.ANONYMOUS,
      facility_id: undefined,
      user_id: undefined,
      username: undefined,
      fullname: undefined,
    };
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
