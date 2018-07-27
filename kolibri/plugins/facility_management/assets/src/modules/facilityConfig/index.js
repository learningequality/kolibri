import { saveFacilityConfig, resetFacilityConfig } from './actions';

function defaultState() {
  return {
    facilityDatasetId: '',
    facilityName: '',
    notification: null,
    settings: {},
    settingsCopy: {},
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    CONFIG_PAGE_NOTIFY(state, notificationType) {
      state.notification = notificationType;
    },
    CONFIG_PAGE_UNDO_SETTINGS_CHANGE(state) {
      state.settings = Object.assign({}, state.settingsCopy);
    },
    CONFIG_PAGE_MODIFY_SETTING(state, { name, value }) {
      if (state.settings[name] !== undefined) {
        state.settings[name] = value;
      }
    },
    CONFIG_PAGE_MODIFY_ALL_SETTINGS(state, settings) {
      state.settings = Object.assign({}, state.settings, settings);
    },
    // this is basically the inverse of undo settings...
    CONFIG_PAGE_COPY_SETTINGS(state) {
      state.settingsCopy = Object.assign({}, state.settings);
    },
  },
  actions: {
    saveFacilityConfig,
    resetFacilityConfig,
  },
};
