import LessonReportResource from '../../apiResources/lessonReport';

/* Refreshes the Lesson Report (resource vs. fraction of learners-who-completed-it)
 * data on the Lesson Summary Page.
 */
export function refreshLessonReport(store, lessonId) {
  LessonReportResource.getModel(lessonId)
    .fetch({}, true)
    .then(lessonReport => {
      store.dispatch('SET_LESSON_REPORT', lessonReport);
    });
}
