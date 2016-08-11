
const constants = require('./constants');
const Vuex = require('vuex');
const coreStore = require('core-store');

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
  INIT_LOGGING_STATE(state, loggingState) {
    state.pageState.logging = loggingState;
  },
  SET_LOGGING_SUMMARY_STATE(state, summaryState) {
    state.pageState.logging.summary = summaryState;
  },
  SET_LOGGING_SUMMARY_ID(state, summaryId) {
    state.pageState.logging.summary.id = summaryId;
  },
  SET_LOGGING_SESSION_ID(state, sessionId) {
    state.pageState.logging.session.id = sessionId;
  },
  SET_LOGGING_SESSION_STATE(state, sessionState) {
    state.pageState.logging.session = sessionState;
  },
  SET_LOGGING_PROGRESS(state, sessionProgress, summaryProgress) {
    state.pageState.logging.session.progress = sessionProgress;
    state.pageState.logging.summary.progress = summaryProgress;
  },
  SET_LOGGING_COMPLETION_TIME(state, time) {
    state.pageState.logging.summary.completion_timestamp = time;
  },
  SET_LOGGING_TIME(state, sessionTime, summaryTime, currentTime) {
    state.pageState.logging.session.end_timestamp = currentTime;
    state.pageState.logging.summary.end_timestamp = currentTime;
    state.pageState.logging.session.time_spent = sessionTime;
    state.pageState.logging.summary.time_spent = summaryTime;
  },
  SET_LOGGING_PENDING(state, summaryPending, sessionPending) {
    state.pageState.logging.summary.pending_create = summaryPending;
    state.pageState.logging.session.pending_create = sessionPending;
  },
};

// assigns core state and mutations
Object.assign(initialState, coreStore.initialState);
Object.assign(mutations, coreStore.mutations);


module.exports = new Vuex.Store({
  state: initialState,
  mutations,
});
