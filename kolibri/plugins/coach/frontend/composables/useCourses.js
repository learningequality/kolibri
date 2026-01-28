import { ref } from 'vue';
import LearnerGroupResource from 'kolibri-common/apiResources/LearnerGroupResource';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
import useUser from 'kolibri/composables/useUser';
import useFacilities from 'kolibri-common/composables/useFacilities';
import { PageNames } from '../constants';

// Place outside the function to keep the state
const coursesAreLoading = ref(false);
const courses = ref([]);
const learnerGroups = ref([]);
const { getFacilities, facilities } = useFacilities();

export function useCourses() {
  function setCoursesLoading(loading) {
    coursesAreLoading.value = loading;
  }

  // Refresh courses for a given class
  function refreshClassCourses(store, classId) {
    return CourseSessionResource.fetchCollection({
      getParams: { collection: classId },
      force: true,
    })
      .then(courseSessions => {
        // Fetch ContentNode data for each course
        if (courseSessions.length > 0) {
          const contentNodePromises = courseSessions.map(session => {
            return ContentNodeResource.fetchModel({ id: session.content_id })
              .then(contentNode => {
                return { ...session, contentNode };
              })
              .catch(() => {
                // If ContentNode is not available, still return the session
                // but mark that content is missing
                return { ...session, contentNode: null, contentMissing: true };
              });
          });

          return Promise.all(contentNodePromises);
        } else {
          return courseSessions;
        }
      })
      .then(courseSessions => {
        courses.value = courseSessions;
        store.commit('coursesRoot/SET_CLASS_COURSES', courseSessions);
        return courseSessions;
      })
      .catch(error => {
        return store.dispatch('handleApiError', { error }, { root: true });
      });
  }

  // Show the Courses Root Page, where all the Courses are listed for a given Classroom
  async function showCoursesRootPage(store, classId) {
    const initClassInfoPromise = store.dispatch('initClassInfo', classId);
    const getFacilitiesPromise =
      useUser().isSuperuser.value && facilities.value.length === 0
        ? getFacilities().catch(() => {})
        : Promise.resolve();

    await Promise.all([initClassInfoPromise, getFacilitiesPromise]);
    // on this page, don't handle loading state globally so we can do it locally
    store.dispatch('notLoading');

    setCoursesLoading(true);
    courses.value = [];
    learnerGroups.value = [];
    store.commit('coursesRoot/SET_STATE', {
      courses: [],
      learnerGroups: [],
    });
    const loadRequirements = [
      // Fetch learner groups for course assignment
      LearnerGroupResource.fetchCollection({ getParams: { parent: classId } }),
      refreshClassCourses(store, classId),
    ];

    return Promise.all(loadRequirements).then(
      ([fetchedLearnerGroups]) => {
        learnerGroups.value = fetchedLearnerGroups;
        store.commit('coursesRoot/SET_LEARNER_GROUPS', fetchedLearnerGroups);
        store.commit('SET_PAGE_NAME', PageNames.COURSES_ROOT);
        setCoursesLoading(false);
      },
      error => {
        store.dispatch('handleApiError', { error, reloadOnReconnect: true });
        setCoursesLoading(false);
      },
    );
  }

  return {
    courses,
    learnerGroups,
    coursesAreLoading,
    refreshClassCourses,
    showCoursesRootPage,
  };
}
