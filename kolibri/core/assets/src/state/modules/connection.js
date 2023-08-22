export default {
  state: {
    connected: true,
    reconnectTime: null,
    reloadOnReconnect: false,
  },
  getters: {
    connected(state) {
      return state.connected;
    },
    reconnectTime(state) {
      return state.reconnectTime;
    },
  },
  mutations: {
    CORE_SET_CONNECTED(state, connected) {
      state.connected = connected;
    },
    CORE_SET_RECONNECT_TIME(state, reconnectTime) {
      state.reconnectTime = reconnectTime;
    },
    CORE_SET_RELOAD_ON_RECONNECT(state, reloadOnReconnect) {
      state.reloadOnReconnect = reloadOnReconnect;
    },
  },
};
