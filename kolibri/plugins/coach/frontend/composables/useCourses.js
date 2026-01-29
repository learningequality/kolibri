import { computed, ref } from 'vue';
import LearnerGroupResource from 'kolibri-common/apiResources/LearnerGroupResource';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
import useUser from 'kolibri/composables/useUser';
import useFacilities from 'kolibri-common/composables/useFacilities';
import store from 'kolibri/store';
import { PageNames } from '../constants';

const coursesAreLoading = ref(false);
const { getFacilities, facilities } = useFacilities();

export function useCourses() {
  const courses = computed(() => store.state.coursesRoot?.courses || []);
  const learnerGroups = computed(() => store.state.coursesRoot?.learnerGroups || []);

  function setCoursesAreLoading(isLoading) {
    coursesAreLoading.value = isLoading;
  }

  async function refreshClassCourses(storeInstance, classId) {
    setCoursesAreLoading(true);
    try {
      const courseSessions = await CourseSessionResource.fetchCollection({
        getParams: { collection: classId },
        force: true,
      });

      if (!courseSessions.length) {
        storeInstance.commit('coursesRoot/SET_CLASS_COURSES', courseSessions);
        return courseSessions;
      }

      const courseSessionPromises = courseSessions.map(session => {
        const isActive = session.is_active ?? session.active ?? false;
        return ContentNodeResource.fetchModel({ id: session.course })
          .then(contentNode => {
            return { ...session, is_active: isActive, active: isActive, contentNode };
          })
          .catch(() => {
            return {
              ...session,
              is_active: isActive,
              active: isActive,
              contentNode: null,
              contentMissing: true,
            };
          });
      });

      const hydratedSessions = await Promise.all(courseSessionPromises);
      storeInstance.commit('coursesRoot/SET_CLASS_COURSES', hydratedSessions);
      return hydratedSessions;
    } catch (error) {
      return storeInstance.dispatch('handleApiError', { error }, { root: true });
    } finally {
      setCoursesAreLoading(false);
    }
  }

  async function showCoursesRootPage(storeInstance, classId) {
    const initClassInfoPromise = storeInstance.dispatch('initClassInfo', classId);
    const getFacilitiesPromise =
      useUser().isSuperuser.value && facilities.value.length === 0
        ? getFacilities().catch(() => {})
        : Promise.resolve();

    await Promise.all([initClassInfoPromise, getFacilitiesPromise]);
    storeInstance.dispatch('notLoading');

    // Only clear and reload courses if they haven't been loaded yet or data is stale
    const currentCourses = storeInstance.state.coursesRoot?.courses || [];
    const shouldReload = currentCourses.length === 0;

    if (shouldReload) {
      setCoursesAreLoading(true);
      storeInstance.commit('coursesRoot/SET_STATE', { courses: [], learnerGroups: [] });

      const loadRequirements = [
        LearnerGroupResource.fetchCollection({ getParams: { parent: classId } }),
        refreshClassCourses(storeInstance, classId),
      ];

      return Promise.all(loadRequirements).then(
        ([fetchedLearnerGroups]) => {
          storeInstance.commit('coursesRoot/SET_LEARNER_GROUPS', fetchedLearnerGroups);
          storeInstance.commit('SET_PAGE_NAME', PageNames.COURSES_ROOT);
          setCoursesAreLoading(false);
        },
        error => {
          storeInstance.dispatch('handleApiError', { error, reloadOnReconnect: true });
          setCoursesAreLoading(false);
        },
      );
    } else {
      // Courses already loaded, just set the page name
      storeInstance.commit('SET_PAGE_NAME', PageNames.COURSES_ROOT);
      return Promise.resolve();
    }
  }

  return {
    courses,
    learnerGroups,
    coursesAreLoading,
    refreshClassCourses,
    showCoursesRootPage,
  };
}
