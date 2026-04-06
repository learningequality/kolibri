import { ref } from 'vue';
import LearnerGroupResource from 'kolibri-common/apiResources/LearnerGroupResource';
import useUser from 'kolibri/composables/useUser';
import { handleApiError } from 'kolibri/utils/appError';
import useFacilities from 'kolibri-common/composables/useFacilities';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import { PageNames } from '../constants';

// Place outside the function to keep the state
const lessonsAreLoading = ref(false);
const { fetchFacilities, facilities } = useFacilities();

export function useLessons() {
  function setLessonsLoading(loading) {
    lessonsAreLoading.value = loading;
  }

  // Show the Lessons Root Page, where all the Lessons are listed for a given Classroom
  async function showLessonsRootPage(store, classId) {
    const initClassInfoPromise = store.dispatch('initClassInfo', classId);
    const getFacilitiesPromise =
      useUser().isSuperuser.value && facilities.value.length === 0
        ? fetchFacilities().catch(() => {})
        : Promise.resolve();

    await Promise.all([initClassInfoPromise, getFacilitiesPromise]);
    // on this page, don't handle loading state globally so we can do it locally
    pageLoading.value = false;

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
        store.commit('SET_PAGE_NAME', PageNames.LESSONS_ROOT);
        setLessonsLoading(false);
      },
      error => {
        handleApiError({ error, reloadOnReconnect: true });
        setLessonsLoading(false);
      },
    );
  }

  return {
    lessonsAreLoading,
    showLessonsRootPage,
  };
}
