export default {
  namespaced: true,
  state: {
    rootNodes: [],
  },
  mutations: {
    SET_STATE(state, payload) {
      state.rootNodes = payload.rootNodes;
    },
    RESET_STATE(state) {
      state.rootNodes = [];
    },
  },
};
