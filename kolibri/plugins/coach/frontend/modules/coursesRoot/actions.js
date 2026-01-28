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

export function refreshClassCourses(store, classId) {
  return composableRefreshClassCourses(store, classId);
}

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
            name: PageNames.COURSES_ROOT,
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
