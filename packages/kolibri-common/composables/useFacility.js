import { ref, computed, unref } from 'vue';
import { useLocalStorage, StorageSerializers } from '@vueuse/core';
import { currentLanguage } from 'kolibri/utils/i18n';
import useUser from 'kolibri/composables/useUser';
import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
import { OptionsForSignIn } from '../constants/Auth';
import useFacilities from './useFacilities';

/**
 * Composable for accessing the selected facility
 * @param {boolean} listenToStorageChanges Whether to be reactive to localStorage changes
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
 * Composable for accessing a facility's configuration
 * @param {Ref<string>|string} facilityId
 */
export function useFacilityConfig(facilityId) {
  const _facilityId = facilityId;
  const facilityConfig = ref({});

  // computed feature flags
  const _isEnglish = () => currentLanguage === 'en';
  const isAttendanceFeatureEnabled = computed(_isEnglish);
  const isPictureLoginFeatureEnabled = computed(_isEnglish);
  // Gated to English until community translations land on Crowdin, mirroring
  // the picture-password and attendance features. The QR strings carry
  // translation context so they are ready to enable per-locale later.
  const isQrLoginFeatureEnabled = computed(_isEnglish);

  // computed
  const signInOptions = computed(() => {
    const options = [];
    // If not null, then we have picture password settings
    if (facilityConfig.value.picture_password_settings) {
      options.push(OptionsForSignIn.PICTURE_PASSWORD);
    }
    // QR login is an additive option — it coexists with any of the
    // username-based methods and with picture password.
    if (facilityConfig.value.enable_qr_login) {
      options.push(OptionsForSignIn.QR_LOGIN);
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
   * @param {Ref<string|null>|string|null} [facilityId]
   * @return {Promise<void>}
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
    isQrLoginFeatureEnabled,
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
  isQrLoginFeatureEnabled,
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
 * @param {string} facilityId
 * @return {Promise<void>}
 */
async function setFacilityId(facilityId) {
  setSelectedFacilityId(facilityId);
  await _fetchFacility(facilityId);
  await _fetchFacilityConfig(facilityId);
}

/**
 * Refetches the selected facility
 * @return {Promise<void>}
 */
async function fetchFacility() {
  return await _fetchFacility(facilityId);
}

/**
 * Updates the facility config, if necessary
 * @deprecated Use `fetchFacilityConfig` instead
 * @return {Promise<object>}
 */
async function updateFacilityConfig() {
  return await _fetchFacilityConfig(facilityId);
}

/**
 * Updates the facility config, if necessary
 * @return {Promise<object>}
 */
async function fetchFacilityConfig() {
  return await _fetchFacilityConfig(facilityId);
}

/**
 * Composable for the context of a single facility, defaulting to the user's facility, but can be
 * changed by calling `setFacilityId`
 */
export default function useFacility() {
  return {
    facilityId,
    selectedFacility,
    currentFacilityName,
    facilityConfig,
    isAttendanceFeatureEnabled,
    isPictureLoginFeatureEnabled,
    isQrLoginFeatureEnabled,
    signInOptions,
    picturePasswordSettings,
    fetchFacilities,
    fetchFacility,
    fetchFacilityConfig,
    updateFacilityConfig,
    setFacilityId,
  };
}
