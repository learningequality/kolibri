import { computed, onMounted } from 'vue';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import useUser from 'kolibri/composables/useUser';

// A usable that returns the Facility user tied to the session
export default function useCurrentUser() {
  const { currentUserId } = useUser();
  const { data, loading, fetchData } = FacilityUserResource.useRetrieve(currentUserId);

  onMounted(fetchData);

  return {
    // The template reads fields off this object directly, so the pre-fetch null needs a stand-in.
    currentUser: computed(() => data.value || {}),
    isLoading: loading,
  };
}
