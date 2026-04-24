import { ref, computed } from 'vue';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';
import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import useFacilities from 'kolibri-common/composables/useFacilities';
import { OptionsForSignIn, PicturePasswordIconStyle } from 'kolibri-common/constants/Auth';
import { useFacilityConfig } from 'kolibri-common/composables/useFacility';

/**
 * Composable providing facility editor state and actions for the facility settings page.
 * @param {string} facilityId - The ID of the facility to edit.
 * @returns {object} Facility editor state, computed properties, and action methods.
 */
export default function useFacilityEditor(facilityId) {
  const { fetchFacilities, getFacility } = useFacilities();
  const {
    isAttendanceFeatureEnabled,
    isPictureLoginFeatureEnabled,
    signInOptions,
    picturePasswordSettings,
    // TODO: update this composable to use 'facilityConfig' naming instead
    facilityConfig: settings,
    fetchFacilityConfig,
  } = useFacilityConfig(facilityId);

  // Reactive state
  const facilityDatasetId = ref('');
  const facilityName = ref('');
  const settingsCopy = ref({});
  const isFacilityPinValid = ref(false);
  const facilityDataLoading = ref(false);

  // Computed properties
  const facility = computed(() => getFacility(facilityId));

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
  /**
   * Sets the facility data loading state.
   * @param {boolean} loading - Whether data is currently loading.
   * @returns {void}
   */
  function setLoading(loading) {
    facilityDataLoading.value = loading;
  }

  /**
   * Fetches the facility configuration and name from the backend.
   * @returns {Promise<void>} Resolves when facility data has been loaded.
   */
  async function fetchFacility() {
    setLoading(true);

    try {
      await Promise.all([fetchFacilityConfig(), fetchFacilities()]);

      // Facility name set with watcher
      facilityDatasetId.value = settings.value.id;
      facilityName.value = facility.value.name;
      settingsCopy.value = { ...settings.value };
      setLoading(false);
    } catch (error) {
      facilityName.value = '';
      settingsCopy.value = {};
      setLoading(false);
      throw error;
    }
  }

  /**
   * Updates a single facility dataset setting.
   * @param {string} name - The setting property name to update.
   * @param {*} value - The new value for the setting.
   * @returns {void}
   */
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

  /**
   * Updates the sign-in option and adjusts related settings accordingly.
   * @param {string} value - The sign-in option to set (from OptionsForSignIn).
   * @returns {void}
   */
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

  /**
   * Updates a single picture password setting property.
   * @param {string} name - The picture password setting property name.
   * @param {*} value - The new value for the setting.
   * @returns {void}
   */
  function modifyPicturePasswordSetting(name, value) {
    if (signInOptions.value.includes(OptionsForSignIn.PICTURE_PASSWORD)) {
      modifySetting('picture_password_settings', {
        ...picturePasswordSettings.value,
        [name]: value,
      });
    }
  }

  /**
   * Replaces the extra_fields on the current settings with the provided object.
   * @param {object} newExtraFields - The new extra_fields object to set.
   * @returns {void}
   */
  function modifyExtraFields(newExtraFields) {
    settings.value = Object.assign({}, settings.value, {
      extra_fields: newExtraFields,
    });
  }

  /**
   * Saves a copy of the current settings for change detection.
   * @returns {void}
   */
  function copySettings() {
    settingsCopy.value = Object.assign({}, settings.value);
  }

  /**
   * Reverts the current settings to the last saved copy.
   * @returns {void}
   */
  function undoSettingsChange() {
    settings.value = Object.assign({}, settingsCopy.value);
  }

  /**
   * Resets all facility editor state to its initial values.
   * @returns {void}
   */
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
      id: facilityId,
      data: { name },
    });

    // Update facilities list
    await fetchFacilities();

    facilityName.value = name;
    return facility;
  }

  const LOGIN_SETTINGS_FIELDS = [
    'picture_password_settings',
    'learner_can_login_with_no_password',
    'learner_can_edit_password',
  ];

  /**
   * Saves the current facility dataset settings to the backend.
   * @returns {Promise<void>} Resolves when the settings have been saved.
   */
  async function saveFacilityConfig() {
    const data = { ...settings.value };
    for (const field of LOGIN_SETTINGS_FIELDS) {
      delete data[field];
    }
    await FacilityDatasetResource.saveModel({
      id: facilityDatasetId.value,
      data,
    });
    copySettings();
  }

  /**
   * Sets the facility PIN by sending a POST request to the backend.
   * @param {object} payload - The PIN data to save.
   * @returns {Promise<void>} Resolves when the PIN has been set.
   */
  async function setPin(payload) {
    const response = await client({
      url: urls['kolibri:core:facilitydataset_update_pin'](facilityDatasetId.value),
      method: 'POST',
      data: payload,
    });
    modifyExtraFields(response.data.extra_fields);
    await saveFacilityConfig();
  }

  /**
   * Removes the facility PIN by sending a PATCH request to the backend.
   * @returns {Promise<void>} Resolves when the PIN has been removed.
   */
  async function unsetPin() {
    const response = await client({
      url: urls['kolibri:core:facilitydataset_update_pin'](facilityDatasetId.value),
      method: 'PATCH',
    });
    modifyExtraFields(response.data.extra_fields);
    await saveFacilityConfig();
  }

  const pictureLoginTaskId = ref(null);

  /**
   * Saves the facility login settings (sign-in options, picture password) to the backend.
   * @returns {Promise<object>} Resolves with the API response data.
   */
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
