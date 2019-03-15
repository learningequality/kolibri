export default {
  namespaced: true,
  state: {
    classrooms: [],
  },
  mutations: {
    SET_LEARNER_CLASSROOMS(state, classrooms) {
      state.classrooms = [...classrooms];
    },
    RESET_STATE(state) {
      state.classrooms = [];
    },
  },
};
