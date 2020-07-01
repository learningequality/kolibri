export default {
  namespaced: true,
  state: {
    hasMultipleFacilities: null,
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      state.hasMultipleFacilities = null;
    },
  },
};
