import { ref, onMounted, getCurrentInstance } from 'kolibri.lib.vueCompositionApi';
import { FacilityUserResource } from 'kolibri.resources';

// A usable that returns the Facility user tied to the session
export default function useCurrentUser() {
  const $store = getCurrentInstance().proxy.$store;
  const currentUser = ref({});
  const isLoading = ref(false);

  onMounted(() => {
    isLoading.value = true;
    return FacilityUserResource.fetchModel({ id: $store.state.core.session.user_id }).then(
      userModel => {
        currentUser.value = { ...userModel };
        isLoading.value = false;
      }
    );
  });

  return {
    currentUser,
    isLoading,
  };
}
