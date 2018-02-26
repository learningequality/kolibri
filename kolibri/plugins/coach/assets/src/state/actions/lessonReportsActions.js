import { LessonResource, ContentNodeResource } from 'kolibri.resources';
import LessonReportResource from '../../apiResources/lessonReport';
import UserReportResource from '../../apiResources/userReport';
import { CollectionTypes } from '../../lessonsConstants';

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

/*
 * Shows the Lesson Resource Progress Report (all assigned learners vs. progress on resource).
 */
export function showLessonResourceClassroomReport(store, options) {
  const { lessonId, contentId: contentNodeId, classId } = options;
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_STATE', {
    currentLesson: {},
    lessonResourceReport: {},
  });
  const loadRequirements = [
    // Get Lesson for the learner group assignments
    LessonResource.getModel(lessonId).fetch({}, true),
    // Get ContentNode to get the resource kind, title, etc., and channel ID
    // to get Report API
    ContentNodeResource.getModel(contentNodeId).fetch(),
  ];

  return Promise.all(loadRequirements)
    .then(([lesson, contentNode]) => {
      console.log(lesson);
      console.log(contentNode);
      // With Lesson and ContentNode data fetched, query for the whole-Classroom User Report.
      // The non-assigned learners are filtered out on the UI.
      return UserReportResource.getCollection({
        channel_id: contentNode.channel_id,
        collection_id: classId,
        collection_kind: CollectionTypes.CLASSROOM,
        content_node_id: contentNode.pk,
      }).fetch()._promise;
    })
    .then(report => {
      console.log(report);
    })
    .catch(err => {
      console.log(err); // eslint-disable-line
    });
}
