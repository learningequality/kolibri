export default {
  namespaced: true,
  state() {
    return {
      contentNodesMap: {},
      currentLesson: {},
    };
  },
  mutations: {
    SET_LESSON_CONTENTNODES(state, contentNodes) {
      state.contentNodesMap = { ...contentNodes };
    },
    SET_CURRENT_LESSON(state, lesson) {
      state.currentLesson = { ...lesson };
    },
  },
};
