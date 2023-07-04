import { ref } from 'kolibri.lib.vueCompositionApi';

// Place outside the function to keep the state
const lessonsAreLoading = ref(false);

export function useLessons() {
  function setLessonsLoading(loading) {
    lessonsAreLoading.value = loading;
  }

  return {
    lessonsAreLoading,
    setLessonsLoading,
  };
}
