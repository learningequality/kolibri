export default {
  namespaced: true,
  state: {
    currentClassroom: {},
  },
  mutations: {
    SET_CURRENT_CLASSROOM(state, classroom) {
      state.currentClassroom = { ...classroom };
    },
    RESET_STATE(state) {
      state.currentClassroom = {};
    },
  },
};
