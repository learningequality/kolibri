import { ref, computed } from 'vue';
import isEqual from 'lodash/isEqual';
import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import useFacilities from 'kolibri-common/composables/useFacilities';
import { useFacilityConfig } from 'kolibri-common/composables/useFacility';

/**
 * @param {string} facilityId  The ID of the facility to edit
 */
export default function useFacilityEditor(facilityId) {
  const { fetchFacilities, getFacility } = useFacilities();
  const { fetchFacilityConfig } = useFacilityConfig(facilityId);

  // Reactive state
  const facilityDatasetId = ref('');
  const facilityName = ref('');
  const settings = ref({});
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
      const [facilityConfig] = await Promise.all([fetchFacilityConfig(), fetchFacilities()]);

      // Facility name set with watcher
      facilityDatasetId.value = facilityConfig.id;
      facilityName.value = facility.value.name;
      settings.value = { ...facilityConfig };
      settingsCopy.value = { ...facilityConfig };
      setLoading(false);
    } catch (error) {
      facilityName.value = '';
      settings.value = {};
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

  function modifyAllSettings(newSettings) {
    settings.value = Object.assign({}, settings.value, newSettings);
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
    settings.value = {};
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

  async function saveFacilityConfig() {
    await FacilityDatasetResource.saveModel({
      id: facilityDatasetId.value,
      data: settings.value,
    });
    copySettings();
  }

  async function setPin(payload) {
    const response = await client({
      url: urls['kolibri:core:facilitydataset_update_pin'](facilityDatasetId.value),
      method: 'POST',
      data: payload,
    });
    modifyAllSettings({ extra_fields: response.data.extra_fields });
    await saveFacilityConfig();
  }

  async function unsetPin() {
    const response = await client({
      url: urls['kolibri:core:facilitydataset_update_pin'](facilityDatasetId.value),
      method: 'PATCH',
    });
    modifyAllSettings({ extra_fields: response.data.extra_fields });
    await saveFacilityConfig();
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
    // Computed
    settingsHaveChanged,
    isPinSet,
    // Actions
    fetchFacility,
    modifySetting,
    modifyAllSettings,
    copySettings,
    undoSettingsChange,
    resetState,
    saveFacilityName,
    saveFacilityConfig,
    setPin,
    unsetPin,
    setLoading,
  };
}
