import * as actions from './actions';

export default {
  namespaced: true,
  state: {
    contents: [],
    searchTerm: '',
    channelFilter: null,
    kindFilter: null,
    channel_ids: [],
    content_kinds: [],
    total_results: null,
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      state.contents = [];
      state.searchTerm = '';
      state.content_ids = [];
      state.content_kinds = [];
      state.channelFilter = null;
      state.kindFilter = null;
      state.total_results = null;
    },
    SET_SEARCH_TERM(state, searchTerm) {
      state.searchTerm = searchTerm;
    },
    SET_ADDITIONAL_CONTENTS(state, contents) {
      state.contents.push(...contents);
    },
    SET_CONTENT_COPIES(state, copiesCount) {
      copiesCount.forEach(copyCount => {
        const matchingContent = state.contents.find(
          content => copyCount.content_id === content.content_id
        );
        if (matchingContent) {
          matchingContent.copies_count = copyCount.count;
        }
      });
    },
  },
  actions,
};
