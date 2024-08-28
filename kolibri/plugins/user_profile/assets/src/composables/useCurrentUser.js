import { ref, onMounted } from 'kolibri.lib.vueCompositionApi';
import { FacilityUserResource } from 'kolibri.resources';
import useUser from 'kolibri.coreVue.composables.useUser';
import { get } from '@vueuse/core';

// A usable that returns the Facility user tied to the session
export default function useCurrentUser() {
  const { currentUserId } = useUser();
  const currentUser = ref({});
  const isLoading = ref(false);

  onMounted(() => {
    isLoading.value = true;
    return FacilityUserResource.fetchModel({ id: get(currentUserId) }).then(userModel => {
      currentUser.value = { ...userModel };
      isLoading.value = false;
    });
  });

  return {
    currentUser,
    isLoading,
  };
}
