import { ref, computed, unref } from 'vue';
import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import useUser from 'kolibri/composables/useUser';

/**
 * @typedef {Object} UseFacilitiesReturn
 * @property {import('vue').ComputedRef<Object[]>} facilities
 * @property {import('vue').ComputedRef<boolean>} hasMultipleFacilities
 * @property {import('vue').ComputedRef<boolean>} userIsMultiFacilityAdmin
 * @property {() => Promise<void>} fetchFacilities
 * @property {(facilityId: import('vue').Ref<string>|string) => Promise<void>} fetchFacility
 * @property {(facilityId: import('vue').Ref<string>|string) => Object|undefined} getFacility
 */

/**
 * @type {import('vue').Ref<Object[]>}
 * @private
 */
const _facilities = ref([]);

/**
 * @return {UseFacilitiesReturn}
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
   * @param {import('vue').Ref<string>|string} facilityId
   * @return {Object|null}
   */
  function getFacility(facilityId) {
    return _facilities.value.find(f => f.id === unref(facilityId));
  }

  // actions
  /**
   * Fetch all facilities from the backend
   * @return {Promise<void>}
   */
  async function fetchFacilities() {
    _facilities.value = await FacilityResource.fetchCollection({ force: true });
  }

  /**
   * Fetch a single facility from the backend
   * @param {import('vue').Ref<string>|string} facilityId
   * @return {Promise<void>}
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
