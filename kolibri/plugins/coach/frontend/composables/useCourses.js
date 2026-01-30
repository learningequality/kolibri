import { computed, ref } from 'vue';
import { useRoute } from 'vue-router/composables';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
import useSnackbar from 'kolibri/composables/useSnackbar';
import store from 'kolibri/store';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import { PageNames } from '../constants';

const _courses = ref([]);
const coursesAreLoading = ref(false);

export function useCourses() {
  const route = useRoute();
  const classId = computed(() => route.params.classId);
  const courses = computed(() => _courses.value);

  function setCoursesAreLoading(isLoading) {
    coursesAreLoading.value = isLoading;
  }

  function setCourses(courses) {
    _courses.value = courses;
  }

  async function refreshClassCourses() {
    setCoursesAreLoading(true);
    try {
      const courseSessions = await CourseSessionResource.fetchCollection({
        getParams: { collection: classId.value },
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

  async function assignCourse(payload) {
    const data = {
      ...payload,
      collection: classId.value,
    };
    await CourseSessionResource.saveModel({ data });
    const { createSnackbar } = useSnackbar();
    createSnackbar(coursesStrings.$tr('courseIsAssignedTitle'));
  }

  async function showCoursesRootPage() {
    await store.dispatch('initClassInfo', classId.value);
    store.dispatch('notLoading');

    // Only clear and reload courses if they haven't been loaded yet or data is stale
    const currentCourses = _courses.value;
    const shouldReload = currentCourses.length === 0;

    if (shouldReload) {
      setCoursesAreLoading(true);
      setCourses([]);

      return refreshClassCourses()
        .then(() => {
          store.commit('SET_PAGE_NAME', PageNames.COURSES_ROOT);
          setCoursesAreLoading(false);
        })
        .catch(error => {
          store.dispatch('handleApiError', { error, reloadOnReconnect: true });
          setCoursesAreLoading(false);
        });
    } else {
      // Courses already loaded, just set the page name
      store.commit('SET_PAGE_NAME', PageNames.COURSES_ROOT);
      return Promise.resolve();
    }
  }

  return {
    classId,
    courses,
    coursesAreLoading,
    setCourses,
    assignCourse,
    refreshClassCourses,
    showCoursesRootPage,
  };
}
