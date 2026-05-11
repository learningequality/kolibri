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
 * We don't allow this to be reactive to storage changes, since that could cause issues for SPAs
 */
const { selectedFacilityId, setSelectedFacilityId } = useFacilitySelect();

/**
 * Composable for the context of a single facility, defaulting to the user's facility, but can be
 * changed by calling `setFacilityId`
 */
export default function useFacility() {
  const { fetchFacilities, fetchFacility, getFacility } = useFacilities();
  const { facilityConfig: _facilityConfig, fetchFacilityConfig } = useFacilityConfig(
    selectedFacilityId.value,
  );

  // getters
  const selectedFacility = computed(() => {
    if (selectedFacilityId.value) {
      return getFacility(selectedFacilityId.value) || {};
    }
    return {};
  });
  const facilityId = computed(() => {
    // keep facility ID in sync with logic on selected facility
    return selectedFacility.value?.id ? selectedFacility.value.id : null;
  });
  const facilityConfig = computed(() => {
    // prefer the useFacilityConfig composable's value
    if (_facilityConfig.value?.id) {
      return _facilityConfig.value;
    }

    return selectedFacility.value.dataset || {};
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
    setSelectedFacilityId(facilityId);
    await fetchFacility(facilityId);
    await fetchFacilityConfig(facilityId);
  }

  /**
   * Updates the facility config, if necessary
   * @return {Promise<object>}
   */
  async function updateFacilityConfig() {
    return await fetchFacilityConfig(facilityId);
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
  const _facilityId = unref(facilityId);
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
   * @param {Ref<string|null>|string|null} [facilityId]
   * @return {Promise<void>}
   */
  async function fetchFacilityConfig(facilityId = null) {
    facilityId = unref(facilityId) || _facilityId;

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
