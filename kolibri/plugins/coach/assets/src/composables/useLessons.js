import { ref } from 'kolibri.lib.vueCompositionApi';
import { LearnerGroupResource } from 'kolibri.resources';
import { LessonsPageNames } from '../constants/lessonsConstants';

// Place outside the function to keep the state
const lessonsAreLoading = ref(false);

export function useLessons() {
  function setLessonsLoading(loading) {
    lessonsAreLoading.value = loading;
  }

  // Show the Lessons Root Page, where all the Lessons are listed for a given Classroom
  function showLessonsRootPage(store, classId) {
    // on this page, don't handle loading state globally so we can do it locally
    store.dispatch('notLoading');

    setLessonsLoading(true);
    store.commit('lessonsRoot/SET_STATE', {
      lessons: [],
      learnerGroups: [],
    });
    const loadRequirements = [
      // Fetch learner groups for the New Lesson Modal
      LearnerGroupResource.fetchCollection({ getParams: { parent: classId } }),
      store.dispatch('lessonsRoot/refreshClassLessons', classId),
    ];

    return Promise.all(loadRequirements).then(
      ([learnerGroups]) => {
        store.commit('lessonsRoot/SET_LEARNER_GROUPS', learnerGroups);
        store.commit('SET_PAGE_NAME', LessonsPageNames.PLAN_LESSONS_ROOT);
        setLessonsLoading(false);
      },
      error => {
        store.dispatch('handleApiError', { error, reloadOnReconnect: true });
        setLessonsLoading(false);
      }
    );
  }

  return {
    lessonsAreLoading,
    showLessonsRootPage,
  };
}
