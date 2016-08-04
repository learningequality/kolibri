
const constants = require('./constants');
const Vuex = require('vuex');
const coreState = require('core-state');

const initialState = {
  rootTopicId: global.root_node_pk,
  pageName: constants.PageNames.EXPLORE_ROOT,
  pageState: {},
  searchOpen: false,
  searchLoading: false,
  searchState: {
    topics: [],
    contents: [],
    searchTerm: '',
  },
  currentChannelId: global.currentChannelId,
};

const mutations = {
  SET_PAGE_NAME(state, name) {
    state.pageName = name;
  },
  SET_PAGE_STATE(state, pageState) {
    state.pageState = pageState;
    state.searchOpen = false;
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
};

// assigns core state and mutations
Object.assign(initialState, coreState.initialState);
Object.assign(mutations, coreState.mutations);


module.exports = new Vuex.Store({
  state: initialState,
  mutations,
});
