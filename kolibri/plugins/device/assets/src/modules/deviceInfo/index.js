import urls from 'kolibri/urls';
import client from 'kolibri/client';
import plugin_data from 'kolibri-plugin-data';

export default {
  namespaced: true,
  state: {
    deviceInfo: {},
    deviceName: null,
    dataLoading: false,
  },
  mutations: {
    SET_STATE(state, payload) {
      state.deviceInfo = payload.deviceInfo;
      state.deviceName = payload.deviceInfo.device_name;
    },
    SET_DATA_LOADING(state, payload) {
      state.dataLoading = payload;
    },
    SET_DEVICE_NAME(state, name) {
      state.deviceName = name;
    },
    RESET_STATE(state) {
      state.deviceInfo = {};
      state.deviceName = null;
    },
  },
  getters: {
    getDataLoading(state) {
      return state.dataLoading;
    },
    isRemoteContent() {
      return plugin_data.isRemoteContent;
    },
  },
  actions: {
    updateDeviceName(store, name) {
      return client({
        url: urls['kolibri:core:devicename'](),
        method: 'PATCH',
        data: {
          name,
        },
      }).then(response => {
        store.commit('SET_DEVICE_NAME', response.data.name);
      });
    },
  },
};
