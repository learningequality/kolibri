
const constants = require('./constants');
const Vuex = require('vuex');

function initialState() {
  return {
    pageName: constants.PageNames.EXPLORE_ROOT,
    pageMode: constants.PageModes.EXPLORE,
    pageState: {},
    error: '',
    loading: true,
  };
}

const mutations = {
  SET_PAGE_NAME(state, name) {
    state.pageName = name;
  },
  SET_PAGE_MODE(state, mode) {
    state.pageMode = mode;
  },
  SET_LOADING(state) {
    state.pageState = {};
    state.error = '';
    state.loading = true;
  },
  SET_PAGE_STATE(state, pageState) {
    state.pageState = pageState;
    state.error = '';
    state.loading = false;
  },
  SET_PAGE_ERROR(state, error) {
    state.pageState = {};
    state.error = error;
    state.loading = false;
  },
};

module.exports = new Vuex.Store({
  state: initialState(),
  mutations,
});
