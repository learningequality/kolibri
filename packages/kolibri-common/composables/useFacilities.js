import { ref, computed } from 'vue';
import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import useUser from 'kolibri/composables/useUser';

const _facilities = ref([]);

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

  // actions
  async function fetchFacilities() {
    _facilities.value = await FacilityResource.fetchCollection({ force: true });
  }

  function getFacility(facilityId) {
    return _facilities.value.find(f => f.id === facilityId);
  }

  return {
    facilities,
    hasMultipleFacilities,
    userIsMultiFacilityAdmin,
    fetchFacilities,
    getFacility,
  };
}
