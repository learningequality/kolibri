import { ref, computed, onBeforeMount } from 'vue';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';
import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import { OptionsForSignIn, PicturePasswordIconStyle } from 'kolibri-common/constants/Auth';
import useFacility from 'kolibri-common/composables/useFacility';

/**
 * @typedef {object} UseFacilityEditorReturn
 * @property {import('vue').ComputedRef<string>} facilityId - The id of the facility being edited
 * @property {import('vue').Ref<string>} facilityDatasetId - The dataset id used when saving
 * config and PIN changes
 * @property {import('vue').Ref<string>} facilityName - The editable facility name
 * @property {import('vue').Ref<object>} settings - The live facility config being edited
 * @property {import('vue').Ref<object>} settingsCopy - A snapshot of settings used to detect
 * unsaved changes
 * @property {import('vue').Ref<boolean>} isFacilityPinValid - Whether the entered facility PIN is
 * valid
 * @property {import('vue').Ref<boolean>} facilityDataLoading - Whether facility data is loading
 * @property {import('vue').Ref<string|null>} pictureLoginTaskId - The id of the in-progress picture
 * login settings task, or null
 * @property {import('vue').ComputedRef<object>} facility - The selected facility
 * @property {import('vue').ComputedRef<boolean>} settingsHaveChanged - Whether settings differ from
 * the saved snapshot
 * @property {import('vue').ComputedRef<string|null>} isPinSet - The configured PIN code, or null
 * when none is set
 * @property {import('vue').ComputedRef<boolean>} isAttendanceFeatureEnabled - Whether the
 * attendance feature is enabled
 * @property {import('vue').ComputedRef<boolean>} isPictureLoginFeatureEnabled - Whether picture
 * login is enabled
 * @property {import('vue').WritableComputedRef<string>} signInOption - The selected sign-in option
 * @property {import('vue').ComputedRef<string[]>} signInOptions - The available sign-in options
 * @property {import('vue').ComputedRef<object|null>} picturePasswordSettings - The picture password
 * settings, or null when not enabled
 * @property {import('vue').WritableComputedRef<string|undefined>} picturePasswordStyle - The
 * picture password icon style
 * @property {import('vue').WritableComputedRef<boolean|undefined>} picturePasswordShowIconText -
 * Whether picture password icons show their text labels
 * @property {() => Promise<void>} fetchFacility - Refetches the facility and its config
 * @property {(name: string, value: unknown) => void} modifySetting - Sets a facility config field
 * @property {(value: string) => void} modifySignInOption - Applies the chosen sign-in option
 * @property {(name: string, value: unknown) => void} modifyPicturePasswordSetting - Sets a picture
 * password setting field
 * @property {(newExtraFields: object) => void} modifyExtraFields - Replaces the config's
 * extra_fields
 * @property {() => void} copySettings - Snapshots the current settings into settingsCopy
 * @property {() => void} undoSettingsChange - Restores settings from the snapshot
 * @property {() => void} resetState - Resets all editor state to initial values
 * @property {(name: string) => Promise<object>} saveFacilityName - Saves a new facility name
 * @property {() => Promise<void>} saveFacilityConfig - Persists the facility config
 * @property {(payload: object) => Promise<void>} setPin - Sets the facility PIN
 * @property {() => Promise<void>} unsetPin - Clears the facility PIN
 * @property {(loading: boolean) => void} setLoading - Sets the facility data loading flag
 * @property {() => Promise<object>} saveFacilityLoginSettings - Persists the login and picture
 * password settings
 */

/**
 * Composable providing facility editor state and actions for the facility settings page.
 * @returns {UseFacilityEditorReturn} Facility editor state, computed properties, and action methods
 */
export default function useFacilityEditor() {
  const {
    facilityId,
    selectedFacility: facility,
    facilityConfig: settings,
    isAttendanceFeatureEnabled,
    isPictureLoginFeatureEnabled,
    signInOptions,
    picturePasswordSettings,
    fetchFacility,
    fetchFacilityConfig,
  } = useFacility();

  // Reactive state
  const facilityDatasetId = ref('');
  const facilityName = ref('');
  const settingsCopy = ref({});
  const isFacilityPinValid = ref(false);
  const facilityDataLoading = ref(false);

  // Computed properties
  const settingsHaveChanged = computed(() => !isEqual(settings.value, settingsCopy.value));
  const isPinSet = computed(() => {
    if (settings.value.extra_fields?.pin_code) {
      return settings.value.extra_fields.pin_code;
    }
    return null;
  });
  const signInOption = computed({
    get() {
      // the facility editor uses radio buttons, so it's simpler to have this computed value
      // return a single value
      if (signInOptions.value.includes(OptionsForSignIn.PICTURE_PASSWORD)) {
        return OptionsForSignIn.PICTURE_PASSWORD;
      }
      return signInOptions.value[0];
    },
    set(value) {
      modifySignInOption(value);
    },
  });
  const picturePasswordStyle = computed({
    get() {
      return picturePasswordSettings.value?.icon_style;
    },
    set(value) {
      if (Object.values(PicturePasswordIconStyle).includes(value)) {
        modifyPicturePasswordSetting('icon_style', value);
      }
    },
  });
  const picturePasswordShowIconText = computed({
    get() {
      return picturePasswordSettings.value?.show_icon_text;
    },
    set(value) {
      modifyPicturePasswordSetting('show_icon_text', Boolean(value));
    },
  });

  // Actions
  function setLoading(loading) {
    facilityDataLoading.value = loading;
  }

  function modifySetting(name, value) {
    if (settings.value[name] !== undefined) {
      settings.value[name] = value;
    }

    // If learners do not need passwords to log in, learners (and admins)
    // should not be able to edit passwords for their accounts
    if (name === 'learner_can_login_with_no_password' && value === true) {
      modifySetting('learner_can_edit_password', false);
    }
  }

  function modifySignInOption(value) {
    if (value === OptionsForSignIn.PICTURE_PASSWORD) {
      modifySetting('learner_can_login_with_no_password', true);
      // Default
      modifySetting('picture_password_settings', {
        icon_style: PicturePasswordIconStyle.COLORFUL,
        show_icon_text: false,
      });
    } else {
      modifySetting('learner_can_login_with_no_password', value === OptionsForSignIn.USERNAME_ONLY);
      modifySetting('picture_password_settings', null);
    }
  }

  function modifyPicturePasswordSetting(name, value) {
    if (signInOptions.value.includes(OptionsForSignIn.PICTURE_PASSWORD)) {
      modifySetting('picture_password_settings', {
        ...picturePasswordSettings.value,
        [name]: value,
      });
    }
  }

  function modifyExtraFields(newExtraFields) {
    settings.value = Object.assign({}, settings.value, {
      extra_fields: newExtraFields,
    });
  }

  function copySettings() {
    settingsCopy.value = Object.assign({}, settings.value);
  }

  function undoSettingsChange() {
    settings.value = Object.assign({}, settingsCopy.value);
  }

  onBeforeMount(() => {
    facilityDatasetId.value = settings.value.id;
    facilityName.value = facility.value.name;
    copySettings();
  });

  function resetState() {
    facilityDatasetId.value = '';
    facilityName.value = '';
    settingsCopy.value = {};
    isFacilityPinValid.value = false;
    setLoading(false);
  }

  /**
   * Saves a new facility name to the backend and refreshes the facilities list.
   * @param {string} name - The new facility name to save.
   * @returns {Promise<object>} Resolves with the updated facility model.
   */
  async function saveFacilityName(name) {
    const facility = await FacilityResource.saveModel({
      id: facilityId.value,
      data: { name },
    });

    // Update facilities list
    await fetchFacility();

    facilityName.value = name;
    return facility;
  }

  const LOGIN_SETTINGS_FIELDS = [
    'picture_password_settings',
    'learner_can_login_with_no_password',
    'learner_can_edit_password',
  ];

  async function saveFacilityConfig() {
    const data = { ...settings.value };
    for (const field of LOGIN_SETTINGS_FIELDS) {
      delete data[field];
    }
    await FacilityDatasetResource.saveModel({
      id: facilityDatasetId.value,
      data,
    });
    await fetchFacilityConfig();
    copySettings();
  }

  async function setPin(payload) {
    const response = await client({
      url: urls['kolibri:core:facilitydataset_update_pin'](facilityDatasetId.value),
      method: 'POST',
      data: payload,
    });
    modifyExtraFields(response.data.extra_fields);
    await saveFacilityConfig();
  }

  async function unsetPin() {
    const response = await client({
      url: urls['kolibri:core:facilitydataset_update_pin'](facilityDatasetId.value),
      method: 'PATCH',
    });
    modifyExtraFields(response.data.extra_fields);
    await saveFacilityConfig();
  }

  const pictureLoginTaskId = ref(null);

  async function saveFacilityLoginSettings() {
    const data = pick(settings.value, LOGIN_SETTINGS_FIELDS);
    const response = await client({
      url: urls['kolibri:core:facilitydataset_save_facility_login_settings'](
        facilityDatasetId.value,
      ),
      method: 'PATCH',
      data,
    });
    if (response.status === 202 && response.data.task?.id) {
      pictureLoginTaskId.value = response.data.task.id;
    }
    copySettings();
    return response.data;
  }

  return {
    // State
    facilityId,
    facilityDatasetId,
    facilityName,
    settings,
    settingsCopy,
    isFacilityPinValid,
    facilityDataLoading,
    pictureLoginTaskId,
    // Computed
    facility,
    settingsHaveChanged,
    isPinSet,
    isAttendanceFeatureEnabled,
    isPictureLoginFeatureEnabled,
    signInOption,
    signInOptions,
    picturePasswordSettings,
    picturePasswordStyle,
    picturePasswordShowIconText,
    // Actions
    fetchFacility,
    modifySetting,
    modifySignInOption,
    modifyPicturePasswordSetting,
    modifyExtraFields,
    copySettings,
    undoSettingsChange,
    resetState,
    saveFacilityName,
    saveFacilityConfig,
    setPin,
    unsetPin,
    setLoading,
    saveFacilityLoginSettings,
  };
}
