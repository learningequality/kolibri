export default {
  namespaced: true,
  state: {
    deviceInfo: {},
  },
  mutations: {
    SET_STATE(state, payload) {
      state.deviceInfo = payload.deviceInfo;
    },
    RESET_STATE(state) {
      state.deviceInfo = {};
    },
  },
};
