import { ref, computed, unref } from 'vue';
import { useLocalStorage, StorageSerializers } from '@vueuse/core';
import { currentLanguage } from 'kolibri/utils/i18n';
import useUser from 'kolibri/composables/useUser';
import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
import { OptionsForSignIn } from '../constants/Auth';
import useFacilities from './useFacilities';

/**
 * Composable for accessing the selected facility.
 * @param {boolean} listenToStorageChanges - Whether to be reactive to localStorage changes.
 * @returns {object} The reactive selected facility ID and its setter.
 */
export function useFacilitySelect(listenToStorageChanges = false) {
  const { userIsMultiFacilityAdmin } = useFacilities();
  const { userFacilityId, isUserLoggedIn } = useUser();

  const defaultFacilityId = useLocalStorage('facilityId', null, {
    listenToStorageChanges,
    serializer: StorageSerializers.string,
  });

  const selectedFacilityId = computed(() => {
    // don't bother with the persisted store value if user is logged in and not multi-facility admin
    if (isUserLoggedIn.value && !userIsMultiFacilityAdmin.value) {
      return userFacilityId.value;
    }

    return defaultFacilityId.value || userFacilityId.value;
  });

  function setSelectedFacilityId(facilityId) {
    // places like the sign-in flow persist a default facility
    if (!isUserLoggedIn.value || userIsMultiFacilityAdmin.value) {
      defaultFacilityId.value = facilityId;
    }
  }

  return {
    selectedFacilityId,
    setSelectedFacilityId,
  };
}

/**
 * Composable for accessing a facility's configuration.
 * @param {import('vue').Ref<string>|string} facilityId - The facility ID whose config to load.
 * @returns {object} Reactive facility config plus computed sign-in helpers.
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
   * Get the current selected facility's config.
   * @param {import('vue').Ref<string|null>|string|null} [facilityId] - Override the captured
   * facility ID for this fetch.
   * @returns {Promise<object|undefined>} Resolves with the loaded facility config.
   */
  async function fetchFacilityConfig(facilityId = null) {
    facilityId = unref(facilityId) || unref(_facilityId);

    if (!facilityId) {
      return;
    }

    const _facilityConfig = await FacilityDatasetResource.fetchCollection({
      getParams: {
        facility_id: facilityId,
      },
      force: true,
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

/**
 * We don't allow this to be reactive to storage changes, since that could cause issues for SPAs
 */
export const { selectedFacilityId, setSelectedFacilityId } = useFacilitySelect();

const { fetchFacilities, fetchFacility: _fetchFacility, getFacility } = useFacilities();
const {
  facilityConfig,
  fetchFacilityConfig: _fetchFacilityConfig,
  isAttendanceFeatureEnabled,
  isPictureLoginFeatureEnabled,
  signInOptions,
  picturePasswordSettings,
} = useFacilityConfig(selectedFacilityId);

// getters
const selectedFacility = computed(() => {
  if (selectedFacilityId.value) {
    return getFacility(selectedFacilityId.value) || {};
  }
  return {};
});
const facilityId = computed(() => selectedFacilityId.value);
const currentFacilityName = computed(() => {
  return selectedFacility.value ? selectedFacility.value.name : '';
});

/**
 * Sets the selected facility
 * @param {string} facilityId - The ID of the facility to select
 * @returns {Promise<void>}
 */
async function setFacilityId(facilityId) {
  setSelectedFacilityId(facilityId);
  await _fetchFacility(facilityId);
  await _fetchFacilityConfig(facilityId);
}

/**
 * Refetches the selected facility
 * @returns {Promise<void>}
 */
async function fetchFacility() {
  return await _fetchFacility(facilityId);
}

/**
 * Updates the facility config, if necessary
 * @returns {Promise<object>} Resolves with the facility config
 * @deprecated Use `fetchFacilityConfig` instead
 */
async function updateFacilityConfig() {
  return await _fetchFacilityConfig(facilityId);
}

/**
 * Updates the facility config, if necessary
 * @returns {Promise<object>} Resolves with the facility config
 */
async function fetchFacilityConfig() {
  return await _fetchFacilityConfig(facilityId);
}

/**
 * @typedef {object} UseFacilityReturn
 * @property {import('vue').ComputedRef<string>} facilityId - The selected facility's ID
 * @property {import('vue').ComputedRef<object>} selectedFacility - The selected facility, or an
 * empty object when none is cached
 * @property {import('vue').ComputedRef<string>} currentFacilityName - The selected facility's name,
 * or an empty string when none is selected
 * @property {import('vue').Ref<object>} facilityConfig - The selected facility's dataset config
 * @property {import('vue').ComputedRef<boolean>} isAttendanceFeatureEnabled - Whether the
 * attendance feature is enabled for the current language
 * @property {import('vue').ComputedRef<boolean>} isPictureLoginFeatureEnabled - Whether picture
 * login is enabled for the current language
 * @property {import('vue').ComputedRef<string[]>} signInOptions - The sign-in options available for
 * the selected facility
 * @property {import('vue').ComputedRef<object|null>} picturePasswordSettings - The picture password
 * settings, or null when picture login is not enabled
 * @property {() => Promise<void>} fetchFacilities - Fetches all facilities from the backend
 * @property {() => Promise<void>} fetchFacility - Refetches the selected facility
 * @property {() => Promise<object>} fetchFacilityConfig - Refetches the selected facility's config
 * @property {() => Promise<object>} updateFacilityConfig - Deprecated alias of
 * `fetchFacilityConfig`
 * @property {(facilityId: string) => Promise<void>} setFacilityId - Selects a facility and fetches
 * it and its config
 */

/**
 * Composable for the context of a single facility, defaulting to the user's facility, but can be
 * changed by calling `setFacilityId`
 * @returns {UseFacilityReturn} The facility context and its action helpers
 */
export default function useFacility() {
  return {
    facilityId,
    selectedFacility,
    currentFacilityName,
    facilityConfig,
    isAttendanceFeatureEnabled,
    isPictureLoginFeatureEnabled,
    signInOptions,
    picturePasswordSettings,
    fetchFacilities,
    fetchFacility,
    fetchFacilityConfig,
    updateFacilityConfig,
    setFacilityId,
  };
}
