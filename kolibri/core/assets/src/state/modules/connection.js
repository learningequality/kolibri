import appCapabilities from 'kolibri.utils.appCapabilities';

export default {
  state: {
    connected: true,
    reconnectTime: null,
    metered: false,
  },
  getters: {
    activeConnectionIsMetered(state) {
      return state.metered;
    },
    connected(state) {
      return state.connected;
    },
    reconnectTime(state) {
      return state.reconnectTime;
    },
  },
  mutations: {
    CORE_SET_METERED(state, metered) {
      state.metered = metered;
    },
    CORE_SET_CONNECTED(state, connected) {
      state.connected = connected;
    },
    CORE_SET_RECONNECT_TIME(state, reconnectTime) {
      state.reconnectTime = reconnectTime;
    },
  },
  actions: {
    updateMeteredStatus(store) {
      appCapabilities.checkIsMetered().then(response => {
        store.commit('CORE_SET_METERED', response.data.value);
      });
    },
  },
};
