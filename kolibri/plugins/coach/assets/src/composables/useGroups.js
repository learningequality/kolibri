import { ref } from 'kolibri.lib.vueCompositionApi';

// Place outside the function to keep the state
const groupsAreLoading = ref(false);

export function useGroups() {
  function setGroupsLoading(loading) {
    groupsAreLoading.value = loading;
  }

  return {
    groupsAreLoading,
    setGroupsLoading,
  };
}
