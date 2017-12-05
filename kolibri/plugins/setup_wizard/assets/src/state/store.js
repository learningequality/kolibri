import { currentLanguage } from 'kolibri.utils.i18n';
import findKey from 'lodash/findKey';
import { permissionPresets } from './constants';

export const initialState = {
  onboardingData: {
    language_id: currentLanguage,
    facility: {
      name: '',
    },
    superuser: {
      full_name: '',
      username: '',
      password: '',
    },
    preset: findKey(permissionPresets, preset => preset.default) || '',
  },
  loading: false,
  error: false,
  onboardingStep: 1,
};

export const mutations = {
  SET_LANGUAGE(state, language_id) {
    state.onboardingData.language_id = language_id;
  },
  SET_FACILITY_NAME(state, name) {
    state.onboardingData.facility.name = name;
  },
  SET_SU(state, { name, username, password }) {
    state.onboardingData.superuser.username = username;
    state.onboardingData.superuser.full_name = name;
    state.onboardingData.superuser.password = password;
  },
  SET_FACILITY_PRESET(state, preset) {
    state.onboardingData.preset = preset;
  },
  SET_LOADING(state, loadingFlag) {
    state.loading = loadingFlag;
  },
  SET_ERROR(state, errorFlag) {
    state.error = errorFlag;
  },
  INCREMENT_ONBOARDING_STEP(state) {
    state.onboardingStep++;
  },
  DECREMENT_ONBOARDING_STEP(state) {
    state.onboardingStep--;
  },
  SET_ONBOARDING_STEP(state, step) {
    state.onboardingStep = step;
  },
};
