import Vuex from 'kolibri.lib.vuex';
import { findKey } from 'lodash';
import { permissionPresets } from './constants';
import {
  initialState as coreInitialState,
  mutations as coreMutations,
} from 'kolibri.coreVue.vuex.store';

const initialState = {
  onboardingData: {
    language_id: '',
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
  submitted: false,
  error: false,
  onboardingStep: 1,
};

const mutations = {
  SET_LANGUAGE(state, language_id) {
    state.onboardingData.language_id = language_id;
  },
  SET_FACILITY_NAME(state, name) {
    state.onboardingData.facility.name = name;
  },
  SET_SU_NAME(state, name) {
    state.onboardingData.superuser.full_name = name;
  },
  SET_SU_USERNAME(state, userName) {
    state.onboardingData.superuser.username = userName;
  },
  SET_SU_PASSWORD(state, password) {
    state.onboardingData.superuser.password = password;
  },
  SET_FACILITY_PRESET(state, preset) {
    state.onboardingData.preset = preset;
  },
  SET_SUBMITTED(state, submittedFlag) {
    state.submitted = submittedFlag;
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

// assigns core state and mutations
Object.assign(initialState, coreInitialState);
Object.assign(mutations, coreMutations);

const store = new Vuex.Store({
  state: initialState,
  mutations,
});

export default store;
