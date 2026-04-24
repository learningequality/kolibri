import { currentLanguage } from 'kolibri/utils/i18n';
import { handleApiError } from 'kolibri/utils/appError';

export default {
  namespace: 'SetupWizard',
  state() {
    return {
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
          learner_can_edit_password: null,
        },
        // Set in SuperuserCredentialsForm
        user: {
          full_name: '',
          username: '',
          password: '',
        },
      },
      loading: false,
      error: false,
    };
  },
  actions: {
    showError(store, errorMsg) {
      store.commit('SET_ERROR', true);
      handleApiError({ error: errorMsg });
    },
  },
  mutations: {
    CLEAR_PASSWORD(state) {
      state.onboardingData.user.password = '';
    },
    SET_LANGUAGE(state, language_id) {
      state.onboardingData.language_id = language_id;
    },
    SET_USER_CREDENTIALS(state, payload) {
      state.onboardingData.user = {
        ...state.onboardingData.user,
        ...payload,
      };
    },
    SET_LOADING(state, loadingFlag) {
      state.loading = loadingFlag;
    },
    SET_ERROR(state, errorFlag) {
      state.error = errorFlag;
    },
  },
};
