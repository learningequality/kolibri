import { ref, computed, unref } from 'vue';
import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import useUser from 'kolibri/composables/useUser';

/**
 * @typedef {object} UseFacilitiesReturn
 * @property {import('vue').ComputedRef<object[]>} facilities - The cached list of facilities.
 * @property {import('vue').ComputedRef<boolean>} hasMultipleFacilities - Whether more than one
 * facility is cached.
 * @property {import('vue').ComputedRef<boolean>} userIsMultiFacilityAdmin - Whether the user is a
 * superuser with access to multiple facilities.
 * @property {() => Promise<void>} fetchFacilities - Fetches all facilities from the backend.
 * @property {(facilityId: import('vue').Ref<string>|string) => Promise<void>} fetchFacility -
 * Fetches a single facility from the backend and caches it.
 * @property {(facilityId: import('vue').Ref<string> | string) => object | undefined} getFacility -
 * Returns a cached facility by ID.
 */

/**
 * @type {import('vue').Ref<object[]>}
 * @private
 */
const _facilities = ref([]);

/**
 * Composable for the set of facilities known to this device.
 * @returns {UseFacilitiesReturn} The cached facilities and helpers to read and refresh them.
 */
export default function useFacilities() {
  const { isSuperuser } = useUser();

  // getters
  const facilities = computed(() => _facilities.value);
  const hasMultipleFacilities = computed(() => {
    return _facilities.value.length > 1;
  });
  const userIsMultiFacilityAdmin = computed(() => {
    return isSuperuser.value && hasMultipleFacilities.value;
  });

  /**
   * Get a particular facility from the cache
   * @param {import('vue').Ref<string>|string} facilityId - The ID of the facility to look up.
   * @returns {object | null} The cached facility, or undefined when not cached.
   */
  function getFacility(facilityId) {
    return _facilities.value.find(f => f.id === unref(facilityId));
  }

  // actions
  /**
   * Fetch all facilities from the backend
   * @returns {Promise<void>}
   */
  async function fetchFacilities() {
    _facilities.value = await FacilityResource.fetchCollection({ force: true });
  }

  /**
   * Fetch a single facility from the backend
   * @param {import('vue').Ref<string>|string} facilityId - The ID of the facility to fetch.
   * @returns {Promise<void>}
   */
  async function fetchFacility(facilityId) {
    const facility = await FacilityResource.fetchModel({ id: unref(facilityId), force: true });
    let replaced = false;

    for (let i = 0; i < _facilities.value.length; i++) {
      if (_facilities.value[i].id === facility.id) {
        replaced = true;
        _facilities.value.splice(i, 1, {
          ..._facilities.value[i],
          ...facility,
        });
        break;
      }
    }

    if (!replaced) {
      _facilities.value.push(facility);
    }
  }

  return {
    facilities,
    hasMultipleFacilities,
    userIsMultiFacilityAdmin,
    fetchFacilities,
    fetchFacility,
    getFacility,
  };
}
