function defaultState() {
  return {
    ancestorCounts: {},
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
    SET_ANCESTOR_COUNTS(state, ancestorCountsObject) {
      state.ancestorCounts = ancestorCountsObject;
    },
    SET_CONTENT_LIST(state, contentList) {
      state.contentList = contentList;
    },
    SET_PREVIEW_STATE(state, previewState) {
      state.preview = previewState;
    },
  },
};
