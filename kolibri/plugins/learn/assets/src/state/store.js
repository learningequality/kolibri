
const constants = require('./constants');
const Vuex = require('kolibri.lib.vuex');
const coreStore = require('kolibri.coreVue.vuex.store');

const initialState = {
  pageName: constants.PageNames.EXPLORE_CHANNEL,
  pageState: {
    searchLoading: false,
    searchState: {
      topics: [],
      contents: [],
      searchTerm: '',
    },
  },
};

const mutations = {
  SET_PAGE_NAME(state, name) {
    state.pageName = name;
  },
  SET_PAGE_STATE(state, pageState) {
    state.pageState = pageState;
  },
  SET_SEARCH_LOADING(state) {
    state.pageState.searchLoading = true;
  },
  SET_SEARCH_STATE(state, searchState) {
    state.pageState.searchState = searchState;
    state.pageState.searchLoading = false;
  },
};

// assigns core state and mutations
Object.assign(initialState, coreStore.initialState);
Object.assign(mutations, coreStore.mutations);


module.exports = new Vuex.Store({
  state: initialState,
  mutations,
});
