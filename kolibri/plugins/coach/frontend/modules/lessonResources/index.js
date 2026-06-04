function defaultState() {
  return {
    bookmarksList: [],
    descendantCounts: {},
    ancestors: [],
    contentList: [],
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
    SET_BOOKMARKS_LIST(state, bookmarks) {
      state.bookmarksList = bookmarks;
    },
    SET_DESCENDANT_COUNTS(state, descendantCountsObject) {
      state.descendantCounts = descendantCountsObject;
    },
    SET_CONTENT_LIST(state, contentList) {
      state.contentList = contentList;
    },
    SET_PREVIEW_STATE(state, previewState) {
      state.preview = previewState;
    },
    SET_CURRENT_CONTENT_NODE(state, contentNode) {
      state.currentContentNode = contentNode;
    },
  },
};
