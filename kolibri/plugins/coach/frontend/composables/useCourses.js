import { computed, ref } from 'vue';
import { useRoute } from 'vue-router/composables';
import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';

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

  function updateCourse(courseId, updates) {
    _courses.value = _courses.value.map(course =>
      course.id === courseId ? { ...course, ...updates } : course,
    );
  }

  function removeCourse(courseId) {
    _courses.value = _courses.value.filter(course => course.id !== courseId);
  }

  async function deleteCourse(courseId) {
    await CourseSessionResource.deleteModel({ id: courseId });
    removeCourse(courseId);
  }

  async function refreshClassCourses() {
    setCoursesAreLoading(true);
    try {
      const courseSessions = await CourseSessionResource.fetchCollection({
        getParams: { collection: classId.value },
        force: true,
      });

      // Map backend fields for compatibility
      const mappedSessions = courseSessions.map(session => {
        return {
          ...session,
          contentMissing: session.missing_resource,
        };
      });

      setCourses(mappedSessions);
      return mappedSessions;
    } finally {
      setCoursesAreLoading(false);
    }
  }

  return {
    classId,
    courses,
    coursesAreLoading,
    setCourses,
    updateCourse,
    removeCourse,
    deleteCourse,
    refreshClassCourses,
  };
}
