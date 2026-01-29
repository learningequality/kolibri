import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
import router from 'kolibri/router';
import { createTranslator } from 'kolibri/utils/i18n';
import useSnackbar from 'kolibri/composables/useSnackbar';
import { PageNames } from '../../constants';
import { useCourses } from '../../composables/useCourses';

const translator = createTranslator('CourseRootActionTexts', {
  newCourseAssigned: {
    message: 'New course assigned',
    context: 'Notification that a new course has been assigned.',
  },
});

const { refreshClassCourses: composableRefreshClassCourses } = useCourses();

/**
 * Refresh the courses for a given class
 * Delegates to the composable function for implementation
 * @param {Object} store - Vuex store instance
 * @param {string} classId - The ID of the class
 * @returns {Promise} Promise that resolves with the course sessions
 */
export function refreshClassCourses(store, classId) {
  return composableRefreshClassCourses(store, classId);
}

/**
 * Assign a new course to a class
 * Creates a new course session and updates the class summary
 * @param {Object} store - Vuex store instance
 * @param {Object} params - Assignment parameters
 * @param {string} params.classId - The ID of the class
 * @param {Object} params.payload - Course assignment payload data
 * @returns {Promise} Promise that resolves when assignment is complete
 */
export function assignCourse(store, { classId, payload }) {
  return new Promise((resolve, reject) => {
    const data = {
      ...payload,
      collection: classId,
    };
    return CourseSessionResource.saveModel({
      data,
    })
      .then(() => {
        const { createSnackbar } = useSnackbar();
        createSnackbar(translator.$tr('newCourseAssigned'));
        // Update the class summary now that we have a new course assigned!
        store.dispatch('classSummary/refreshClassSummary', null, { root: true }).then(() => {
          router.push({
            name: PageNames.COURSES_ASSIGN_COURSE_DETAILS,
            params: {
              classId,
            },
          });
          resolve();
        });
      })
      .catch(error => {
        reject(error);
      });
  });
}
