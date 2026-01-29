import { computed } from 'vue';
import LearnerGroupResource from 'kolibri-common/apiResources/LearnerGroupResource';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
import useUser from 'kolibri/composables/useUser';
import useFacilities from 'kolibri-common/composables/useFacilities';
import store from 'kolibri/store';
import { PageNames } from '../constants';

export function useCourses() {
  const { getFacilities, facilities } = useFacilities();


  const courses = computed(() => store.state.coursesRoot?.courses || []);
  const learnerGroups = computed(() => store.state.coursesRoot?.learnerGroups || []);
  const coursesAreLoading = computed(() => store.state.loading);


  function refreshClassCourses(storeInstance, classId) {
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
                return { ...session, contentNode: null, contentMissing: true };
              });
          });

          return Promise.all(contentNodePromises);
        } else {
          return courseSessions;
        }
      })
      .then(courseSessions => {
        storeInstance.commit('coursesRoot/SET_CLASS_COURSES', courseSessions);
        return courseSessions;
      })
      .catch(error => {
        return storeInstance.dispatch('handleApiError', { error }, { root: true });
      });
  }

  async function showCoursesRootPage(storeInstance, classId) {
    const initClassInfoPromise = storeInstance.dispatch('initClassInfo', classId);
    const getFacilitiesPromise =
      useUser().isSuperuser.value && facilities.value.length === 0
        ? getFacilities().catch(() => {})
        : Promise.resolve();

    await Promise.all([initClassInfoPromise, getFacilitiesPromise]);
    storeInstance.dispatch('notLoading');
    storeInstance.commit('coursesRoot/SET_STATE', {
      courses: [],
      learnerGroups: [],
    });

    const loadRequirements = [
      LearnerGroupResource.fetchCollection({ getParams: { parent: classId } }),
      refreshClassCourses(storeInstance, classId),
    ];

    return Promise.all(loadRequirements).then(
      ([fetchedLearnerGroups]) => {
        storeInstance.commit('coursesRoot/SET_LEARNER_GROUPS', fetchedLearnerGroups);
        storeInstance.commit('SET_PAGE_NAME', PageNames.COURSES_ROOT);
      },
      error => {
        storeInstance.dispatch('handleApiError', { error, reloadOnReconnect: true });
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
