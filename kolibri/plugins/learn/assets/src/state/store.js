
const constants = require('./constants');
const Vuex = require('vuex');
const coreStore = require('kolibri.coreVue.vuex.store');

const initialState = {
  pageName: constants.PageNames.EXPLORE_CHANNEL,
  pageState: {},
  searchOpen: false,
  searchLoading: false,
  searchState: {
    topics: [],
    contents: [],
    searchTerm: '',
  },
  channelList: {},
  currentChannelId: '',
  rootTopicId: '',
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
  SET_CURRENT_CHANNEL(state, channelId) {
    state.currentChannelId = channelId;
  },
  SET_CHANNEL_LIST(state, channelList) {
    state.channelList = channelList;
  },
  SET_ROOT_TOPIC_ID(state, rootTopicId) {
    state.rootTopicId = rootTopicId;
  },
};

// assigns core state and mutations
Object.assign(initialState, coreStore.initialState);
Object.assign(mutations, coreStore.mutations);


module.exports = new Vuex.Store({
  state: initialState,
  mutations,
});
