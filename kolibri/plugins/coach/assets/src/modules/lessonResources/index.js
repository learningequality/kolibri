import union from 'lodash/union';
import unionBy from 'lodash/unionBy';
import * as actions from './actions';

function defaultState() {
  return {
    ancestorCounts: {},
    ancestors: [],
    contentList: [],
    searchResults: {
      channel_ids: [],
      content_kinds: [],
      results: [],
      total_results: 0,
    },
    currentContentNode: {},
    preview: {
      completionData: null,
      questions: null,
    },
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  actions,
  getters: {
    numRemainingSearchResults(state) {
      return state.searchResults.total_results - state.searchResults.results.length;
    },
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    SET_ANCESTORS(state, ancestors) {
      state.ancestors = [...ancestors];
    },
    SET_ANCESTOR_COUNTS(state, ancestorCountsObject) {
      state.ancestorCounts = ancestorCountsObject;
    },
    SET_CONTENT_LIST(state, contentList) {
      state.contentList = contentList;
    },
    SET_SEARCH_RESULTS(state, searchResults) {
      state.searchResults = searchResults;
    },
    SET_PREVIEW_STATE(state, previewState) {
      state.preview = previewState;
    },
    SET_ADDITIONAL_SEARCH_RESULTS(state, searchResults) {
      // Append the new results
      state.searchResults.results = unionBy(
        [...state.searchResults.results, ...searchResults.results],
        'id'
      );
      // Append the filters
      state.searchResults.channel_ids = union(
        state.searchResults.channel_ids,
        searchResults.channel_ids
      );
      state.searchResults.content_kinds = union(
        state.searchResults.content_kinds,
        searchResults.content_kinds
      );
      // NOTE: Don't update total_results. Must keep the value set initially
      // for remainingSearchResults to work properly
    },
    SET_CURRENT_CONTENT_NODE(state, contentNode) {
      state.currentContentNode = contentNode;
    },
  },
};
