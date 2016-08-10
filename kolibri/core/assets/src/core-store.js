

const UserKinds = require('./constants').UserKinds;

// core state is namespaced, and merged with a particular app's state
const initialState = {
  core: {
    error: '',
    loading: true,
    session: { kind: UserKinds.ANONYMOUS, error: '200' },
    login_modal_state: false,
    is_admin_or_superuser: false,
    fullname: '',
  },
};

const mutations = {
  CORE_SET_SESSION(state, value) {
    state.core.session = value;
    state.core.login_modal_state = false;
    console.log('state.core.session: ', state.core.session);
  },
  // Makes settings for wrong credentials 401 error
  HANDLE_WRONG_CREDS(state, value) {
    state.core.session = value;
  },
  CORE_CLEAR_SESSION(state) {
    state.core.session = { kind: UserKinds.ANONYMOUS, error: '200' };
    state.core.is_admin_or_superuser = false;
  },
  CORE_SET_PAGE_LOADING(state, value) {
    state.core.loading = value;
  },
  CORE_SET_ERROR(state, error) {
    state.core.error = error;
  },
  // Handles state of login modal appearance
  SET_MODAL_STATE(state, value) {
    state.core.login_modal_state = value;
  },
  SET_ADMIN_STATUS(state, value) {
    state.core.is_admin_or_superuser = value;
  },
};

module.exports = {
  initialState,
  mutations,
};
