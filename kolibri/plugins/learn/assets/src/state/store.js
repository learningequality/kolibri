
const constants = require('./constants');
const Vuex = require('vuex');

function initialState() {
  return {
    rootTopicId: global.root_node_pk,
    pageName: constants.PageNames.EXPLORE_ROOT,
    pageState: {},
    error: '',
    loading: true,
    searchOpen: false,
    searchLoading: false,
    searchState: {
      topics: [],
      contents: [],
    },
  };
}

const mutations = {
  SET_PAGE_NAME(state, name) {
    state.pageName = name;
  },
  SET_PAGE_LOADING(state) {
    state.loading = true;
  },
  SET_PAGE_STATE(state, pageState) {
    state.pageState = pageState;
    state.loading = false;
  },
  SET_SEARCH_LOADING(state) {
    state.searchLoading = true;
  },
  SET_SEARCH_STATE(state, searchState) {
    state.searchState = searchState;
    state.searchLoading = false;
  },
  TOGGLE_SEARCH(state) {
    state.searchOpen = !state.searchOpen;
  },
  SET_ERROR(state, error) {
    state.error = error;
  },
};

module.exports = new Vuex.Store({
  state: initialState(),
  mutations,
});
