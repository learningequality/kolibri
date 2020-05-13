import client from 'kolibri.client';
import urls from 'kolibri.urls';
import { currentLanguage, createTranslator } from 'kolibri.utils.i18n';
import { DemographicConstants } from 'kolibri.coreVue.vuex.constants';
import { Presets, permissionPresets } from '../constants';

const SetupStrings = createTranslator('SetupStrings', {
  personalFacilityName: {
    message: 'Home Facility {name}',
    context: 'Template for a facility name for personal setups',
  },
});

const { NOT_SPECIFIED } = DemographicConstants;

export default {
  state: {
    started: false,
    // The shape of onboardingData needs to match the DevisionProvisionSerializer
    onboardingData: {
      // If device name is null, it will default to hostname. Blank names aren't allowed.
      device_name: null,
      // Set in DefaultLanguageForm
      language_id: currentLanguage,
      // Set in FacilityPermissionsForm
      facility: {
        name: '',
      },
      preset: null,
      // Set in GuessAccessForm
      allow_guest_access: null,
      // Keys match schema of FacilityDatasetModel
      settings: {
        // Set in CreateLearnerAccountForm
        learner_can_sign_up: null,
        learner_can_edit_name: null,
        learner_can_edit_username: null,
        // Set in RequirePasswordForLearnersForm
        learner_can_login_with_no_password: null,
      },
      // Set in SuperuserCredentialsForm
      superuser: {
        full_name: '',
        username: '',
        password: '',
        gender: NOT_SPECIFIED,
        birth_year: NOT_SPECIFIED,
      },
    },
    loading: false,
    error: false,
  },
  actions: {
    getFacilityAdmins() {
      return client({
        path: urls['kolibri:kolibri.plugins.setupWizard:facilityadminsList'](),
      }).then(response => {
        return response.entity;
      });
    },
    grantSuperuserPermisions(store, data) {
      return client({
        path: urls['kolibri:kolibri.plugins.setupWizard:grantsuperuserpermissionsList'](),
        entity: {
          user_id: data.user_id,
          password: data.password,
        },
      });
    },
    provisionDevice(store) {
      const onboardingData = store.state.onboardingData;

      // Make a copy so data is available when 'kolibriLogin' is called
      const superuser = { ...onboardingData.superuser };

      // Strip out onboarding data so serializer can apply defaults
      if (onboardingData.preset === Presets.PERSONAL) {
        onboardingData.settings = {};
        onboardingData.device_name = null;
        onboardingData.facility.name = SetupStrings.$tr('personalFacilityName', {
          name: store.state.onboardingData.superuser.full_name,
        }).slice(0, 49);
      }

      store.commit('SET_LOADING', true);

      return client({ path: urls['kolibri:core:deviceprovision'](), entity: onboardingData }).then(
        response => {
          superuser.facility = response.entity.facility.id;
          store.dispatch('kolibriLogin', superuser);
        },
        error => {
          store.commit('SET_ERROR', true);
          store.dispatch('handleApiError', error);
        }
      );
    },
    setPersonalUsageDefaults(store) {
      store.commit('SET_FACILITY_PRESET', Presets.PERSONAL);
    },
    setFormalUsageDefaults(store) {
      const defaults = permissionPresets.formal.mappings;
      store.commit('SET_FACILITY_PRESET', Presets.FORMAL);
      store.commit('SET_ALLOW_GUEST_ACCESS', false);
      store.commit('SET_LEARNER_CAN_SIGN_UP', defaults.learner_can_sign_up);
      store.commit(
        'SET_LEARNER_CAN_LOGIN_WITH_NO_PASSWORD',
        defaults.learner_can_login_with_no_password
      );
    },
    setNonformalUsageDefaults(store) {
      const defaults = permissionPresets.nonformal.mappings;
      store.commit('SET_FACILITY_PRESET', Presets.NONFORMAL);
      store.commit('SET_ALLOW_GUEST_ACCESS', true);
      store.commit('SET_LEARNER_CAN_SIGN_UP', defaults.learner_can_sign_up);
      store.commit(
        'SET_LEARNER_CAN_LOGIN_WITH_NO_PASSWORD',
        defaults.learner_can_login_with_no_password
      );
    },
  },
  mutations: {
    START_SETUP(state) {
      state.started = true;
    },
    SET_DEVICE_NAME(state, value) {
      state.onboardingData.device_name = value;
    },
    CLEAR_PASSWORD(state) {
      state.onboardingData.superuser.password = '';
    },
    SET_LANGUAGE(state, language_id) {
      state.onboardingData.language_id = language_id;
    },
    SET_FACILITY_NAME(state, name) {
      state.onboardingData.facility.name = name;
    },
    SET_SUPERUSER_CREDENTIALS(state, payload) {
      state.onboardingData.superuser = {
        ...state.onboardingData.superuser,
        ...payload,
      };
    },
    SET_FACILITY_PRESET(state, preset) {
      state.onboardingData.preset = preset;
    },
    SET_ALLOW_GUEST_ACCESS(state, setting) {
      state.onboardingData.allow_guest_access = setting;
    },
    SET_LEARNER_CAN_SIGN_UP(state, setting) {
      // These three options are set together
      state.onboardingData.settings.learner_can_sign_up = setting;
      state.onboardingData.settings.learner_can_edit_name = setting;
      state.onboardingData.settings.learner_can_edit_username = setting;
    },
    SET_LEARNER_CAN_LOGIN_WITH_NO_PASSWORD(state, setting) {
      state.onboardingData.settings.learner_can_login_with_no_password = setting;
    },
    SET_LOADING(state, loadingFlag) {
      state.loading = loadingFlag;
    },
    SET_ERROR(state, errorFlag) {
      state.error = errorFlag;
    },
  },
};
