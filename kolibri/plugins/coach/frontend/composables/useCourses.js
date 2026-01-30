import { computed, ref } from 'vue';
import LearnerGroupResource from 'kolibri-common/apiResources/LearnerGroupResource';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
import useUser from 'kolibri/composables/useUser';
import useFacilities from 'kolibri-common/composables/useFacilities';
import useSnackbar from 'kolibri/composables/useSnackbar';
import router from 'kolibri/router';
import store from 'kolibri/store';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import { PageNames } from '../constants';

const _courses = ref([]);
const _learnerGroups = ref([]);
const coursesAreLoading = ref(false);
const { getFacilities, facilities } = useFacilities();

export function useCourses() {
  const courses = computed(() => _courses.value);
  const learnerGroups = computed(() => _learnerGroups.value);

  function setCoursesAreLoading(isLoading) {
    coursesAreLoading.value = isLoading;
  }

  function setCourses(courses) {
    _courses.value = courses;
  }

  function setLearnerGroups(groups) {
    _learnerGroups.value = groups;
  }

  async function refreshClassCourses(classId) {
    setCoursesAreLoading(true);
    try {
      const courseSessions = await CourseSessionResource.fetchCollection({
        getParams: { collection: classId },
        force: true,
      });

      if (!courseSessions.length) {
        setCourses(courseSessions);
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
      setCourses(hydratedSessions);
      return hydratedSessions;
    } catch (error) {
      return store.dispatch('handleApiError', { error }, { root: true });
    } finally {
      setCoursesAreLoading(false);
    }
  }

  async function assignCourse({ classId, payload }) {
    const data = {
      ...payload,
      collection: classId,
    };
    await CourseSessionResource.saveModel({ data });
    const { createSnackbar } = useSnackbar();
    createSnackbar(coursesStrings.$tr('courseIsAssignedTitle'));
    // Update the class summary now that we have a new course assigned!
    await store.dispatch('classSummary/refreshClassSummary', null, { root: true });
    router.push({
      name: PageNames.COURSES_ASSIGN_COURSE_DETAILS,
      params: {
        classId,
      },
    });
  }

  async function showCoursesRootPage(classId) {
    const initClassInfoPromise = store.dispatch('initClassInfo', classId);
    const getFacilitiesPromise =
      useUser().isSuperuser.value && facilities.value.length === 0
        ? getFacilities().catch(() => {})
        : Promise.resolve();

    await Promise.all([initClassInfoPromise, getFacilitiesPromise]);
    store.dispatch('notLoading');

    // Only clear and reload courses if they haven't been loaded yet or data is stale
    const currentCourses = _courses.value;
    const shouldReload = currentCourses.length === 0;

    if (shouldReload) {
      setCoursesAreLoading(true);
      setCourses([]);
      setLearnerGroups([]);

      const loadRequirements = [
        LearnerGroupResource.fetchCollection({ getParams: { parent: classId } }),
        refreshClassCourses(classId),
      ];

      return Promise.all(loadRequirements).then(
        ([fetchedLearnerGroups]) => {
          setLearnerGroups(fetchedLearnerGroups);
          store.commit('SET_PAGE_NAME', PageNames.COURSES_ROOT);
          setCoursesAreLoading(false);
        },
        error => {
          store.dispatch('handleApiError', { error, reloadOnReconnect: true });
          setCoursesAreLoading(false);
        },
      );
    } else {
      // Courses already loaded, just set the page name
      store.commit('SET_PAGE_NAME', PageNames.COURSES_ROOT);
      return Promise.resolve();
    }
  }

  return {
    courses,
    learnerGroups,
    coursesAreLoading,
    setCourses,
    setLearnerGroups,
    assignCourse,
    refreshClassCourses,
    showCoursesRootPage,
  };
}
