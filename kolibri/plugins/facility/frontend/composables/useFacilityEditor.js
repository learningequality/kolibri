import { ref, computed } from 'vue';
import isEqual from 'lodash/isEqual';
import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import useFacilities from 'kolibri-common/composables/useFacilities';
import { OptionsForSignIn, PicturePasswordIconStyle } from 'kolibri-common/constants/Auth';
import { useFacilityConfig } from 'kolibri-common/composables/useFacility';

/**
 * @param {string} facilityId  The ID of the facility to edit
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
  function setLoading(loading) {
    facilityDataLoading.value = loading;
  }

  /**
   * Loads the facility and it's config into the composable state
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

  function resetState() {
    facilityDatasetId.value = '';
    facilityName.value = '';
    settingsCopy.value = {};
    isFacilityPinValid.value = false;
    setLoading(false);
  }

  /**
   * Updates the facility's name
   * @param {string} name
   * @return {Promise<*>}
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
    const data = {
      picture_password_settings: settings.value.picture_password_settings,
      learner_can_login_with_no_password: settings.value.learner_can_login_with_no_password,
      learner_can_edit_password: settings.value.learner_can_edit_password,
    };
    const response = await client({
      url: urls['kolibri:core:facilitydataset_save_facility_login_settings'](
        facilityDatasetId.value,
      ),
      method: 'POST',
      data,
    });
    if (response.data.id && response.data.status) {
      pictureLoginTaskId.value = response.data.id;
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
