import Vuex from 'kolibri.lib.vuex';
import {
  initialState as coreInitialState,
  mutations as coreMutations,
} from 'kolibri.coreVue.vuex.store';

const initialState = {
  onboardingData: {
    language: '',
    facilityName: '',
    suName: '',
    suUsername: '',
    suPassword: '',
    facilityPreset: '',
  },
  submitted: false,
  error: false,
  onboardingStep: 1,
};

const mutations = {
  SET_LANGUAGE(state, language) {
    state.onboardingData.language = language;
  },
  SET_FACILITY_NAME(state, facilityName) {
    state.onboardingData.facilityName = facilityName;
  },
  SET_SU_NAME(state, name) {
    state.onboardingData.suName = name;
  },
  SET_SU_USERNAME(state, userName) {
    state.onboardingData.suUsername = userName;
  },
  SET_SU_PASSWORD(state, password) {
    state.onboardingData.suPassword = password;
  },
  SET_FACILITY_PRESET(state, preset) {
    state.onboardingData.facilityPreset = preset;
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
