import { ref, onMounted, getCurrentInstance } from 'kolibri.lib.vueCompositionApi';
import { FacilityUserResource } from 'kolibri.resources';

// A usable that returns the Facility user tied to the session
export default function useCurrentUser() {
  const $store = getCurrentInstance().proxy.$store;
  const facilityUser = ref({});
  const isLoading = ref(false);

  onMounted(() => {
    isLoading.value = true;
    return FacilityUserResource.fetchModel({ id: $store.state.core.session.user_id }).then(
      facilityUser => {
        facilityUser.value = { ...facilityUser };
        isLoading.value = false;
      }
    );
  });

  return {
    facilityUser,
    isLoading,
  };
}
