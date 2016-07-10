
const constants = require('./constants');
const Vuex = require('vuex');

function initialState() {
  return {
    rootTopicId: global.root_node_pk,
    pageName: constants.PageNames.EXPLORE_ROOT,
    pageState: {},
    error: '',
    loading: true,
  };
}

const mutations = {
  SET_PAGE_NAME(state, name) {
    state.pageName = name;
  },
  SET_LOADING(state) {
    state.loading = true;
    state.pageState = {};
    state.error = '';
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
