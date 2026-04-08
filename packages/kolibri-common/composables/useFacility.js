import { ref, computed } from 'vue';
import isPlainObject from 'lodash/isPlainObject';
import { currentLanguage } from 'kolibri/utils/i18n';
import useUser from 'kolibri/composables/useUser';
import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
import Lockr from 'lockr';
import { OptionsForSignIn } from '../constants/Auth';
import useFacilities from './useFacilities';

const selectedFacilityId = ref(Lockr.get('facilityId') || null);

/**
 * Composable for the context of a single facility, defaulting to the user's facility, but can be
 * changed by calling `setFacilityId`
 */
export default function useFacility() {
  const { userFacilityId } = useUser();
  const { fetchFacilities, getFacility } = useFacilities();
  const { facilityConfig: _facilityConfig, fetchFacilityConfig } = useFacilityConfig(
    selectedFacilityId.value,
  );

  // getters
  const selectedFacility = computed(() => {
    if (selectedFacilityId.value) {
      const facilityById = getFacility(selectedFacilityId.value);
      if (facilityById) {
        return facilityById;
      }
    }
    return getFacility(userFacilityId.value) || {};
  });
  const facilityId = computed(() => {
    // keep facility ID in sync with logic on selected facility
    return selectedFacility.value ? selectedFacility.value.id : null;
  });
  const facilityConfig = computed(() => {
    // if we have dataset from the facility object
    if (isPlainObject(selectedFacility.value?.dataset)) {
      return selectedFacility.value.dataset;
    }
    // otherwise leverage the useFacilityConfig composable's value
    return _facilityConfig.value;
  });
  const currentFacilityName = computed(() => {
    return selectedFacility.value ? selectedFacility.value.name : '';
  });

  /**
   * Sets the selected facility
   * @param {string} facilityId
   * @return {Promise<void>}
   */
  async function setFacilityId(facilityId) {
    selectedFacilityId.value = facilityId;

    await updateFacilityConfig();
  }

  /**
   * Updates the facility config, if necessary
   * @return {Promise<object>}
   */
  async function updateFacilityConfig() {
    if (!facilityId.value || isPlainObject(selectedFacility.value?.dataset)) {
      return selectedFacility.value?.dataset;
    }
    // update facility config
    return await fetchFacilityConfig(facilityId.value);
  }

  return {
    facilityId,
    facilityConfig,
    fetchFacilities,
    updateFacilityConfig,
    selectedFacility,
    currentFacilityName,
    setFacilityId,
  };
}

/**
 * Composable for accessing a facility's configuration
 * @param {string} facilityId
 */
export function useFacilityConfig(facilityId) {
  const _facilityId = facilityId;
  const facilityConfig = ref({});

  // computed feature flags
  const _isEnglish = () => currentLanguage === 'en';
  const isAttendanceFeatureEnabled = computed(_isEnglish);
  const isPictureLoginFeatureEnabled = computed(_isEnglish);

  // computed
  const signInOptions = computed(() => {
    const options = [];
    // If not null, then we have picture password settings
    if (facilityConfig.value.picture_password_settings) {
      options.push(OptionsForSignIn.PICTURE_PASSWORD);
    }
    // This can be enabled still, even with picture password enabled
    if (facilityConfig.value.learner_can_login_with_no_password) {
      options.push(OptionsForSignIn.USERNAME_ONLY);
    } else {
      options.push(OptionsForSignIn.USERNAME_PASSWORD);
    }
    return options;
  });
  const picturePasswordSettings = computed(() => {
    // should always be null when not enabled, but this keeps it in sync regardless
    if (signInOptions.value.includes(OptionsForSignIn.PICTURE_PASSWORD)) {
      return facilityConfig.value.picture_password_settings;
    }
    return null;
  });

  /**
   * Get the current selected facility's config
   * @param {string|null} [facilityId]
   * @return {Promise<void>}
   */
  async function fetchFacilityConfig(facilityId = null) {
    facilityId = facilityId || _facilityId;

    if (!facilityId) {
      return;
    }

    const _facilityConfig = await FacilityDatasetResource.fetchCollection({
      getParams: {
        facility_id: facilityId,
      },
    });

    let config = {};
    const facility = _facilityConfig[0];

    if (facility) {
      config = { ...facility };
    }
    facilityConfig.value = config;
    return config;
  }

  return {
    facilityConfig,
    isAttendanceFeatureEnabled,
    isPictureLoginFeatureEnabled,
    signInOptions,
    picturePasswordSettings,
    fetchFacilityConfig,
  };
}
