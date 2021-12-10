export default {
  namespaced: true,
  state() {
    return {
      contentNodes: [],
      currentLesson: {},
    };
  },
  mutations: {
    SET_LESSON_CONTENTNODES(state, contentNodes) {
      state.contentNodes = [...contentNodes];
    },
    SET_CURRENT_LESSON(state, lesson) {
      state.currentLesson = { ...lesson };
    },
  },
};
