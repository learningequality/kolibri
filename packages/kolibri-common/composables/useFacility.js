import { ref, computed } from 'vue';
import isPlainObject from 'lodash/isPlainObject';
import useUser from 'kolibri/composables/useUser';
import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
import Lockr from 'lockr';
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
    fetchFacilityConfig,
  };
}
