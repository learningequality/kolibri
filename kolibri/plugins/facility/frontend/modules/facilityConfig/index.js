import {
  saveFacilityConfig,
  resetFacilityConfig,
  saveFacilityName,
  setPin,
  unsetPin,
  isPinValid,
} from './actions';

function defaultState() {
  return {
    facilityDatasetId: '',
    facilityId: '',
    facilityName: '',
    settings: {},
    settingsCopy: {},
    facilityNameSaved: false,
    facilityNameError: false,
    facilities: [],
    isFacilityPinValid: false,
    facilityDataLoading: false,
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  getters: {
    getFacilityDataLoading(state) {
      return state.facilityDataLoading;
    },
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
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
    FACILITY_NAME_SAVED(state, name) {
      state.facilityName = name;
      state.facilityNameSaved = true;
    },
    FACILITY_NAME_NOT_SAVED(state) {
      state.facilityNameError = true;
    },
    RESET_FACILITY_NAME_STATES(state) {
      state.facilityNameError = false;
      state.facilityNameSaved = false;
    },
    SET_FACILITY_DATA_LOADING(state, value) {
      state.facilityDataLoading = value;
    },
    UPDATE_FACILITIES(state, payload) {
      state.facilities.find(f => {
        return f.name === payload.oldName;
      }).name = payload.newName;
    },
    SET_IS_FACILITY_PIN_VALID(state, valid) {
      state.isFacilityPinValid = valid;
    },
    UPDATE_FACILITY_EXTRA_SETTINGS(state, extraSettings) {
      state.settings = Object.assign({}, state.settings, extraSettings);
    },
  },
  actions: {
    saveFacilityConfig,
    resetFacilityConfig,
    saveFacilityName,
    setPin,
    unsetPin,
    isPinValid,
  },
};
