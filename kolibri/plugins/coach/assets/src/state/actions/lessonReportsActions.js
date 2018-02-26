import { LessonResource, ContentNodeResource, LearnerGroupResource } from 'kolibri.resources';
import LessonReportResource from '../../apiResources/lessonReport';
import UserReportResource from '../../apiResources/userReport';
import { CollectionTypes } from '../../lessonsConstants';
import { setClassState } from './main';

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
    lessonResource: {},
    lessonResourceReport: {},
    learnerGroups: [],
  });
  const loadRequirements = [
    // Get Lesson for the learner group assignments
    LessonResource.getModel(lessonId).fetch({}, true),
    // Get ContentNode to get the resource kind, title, etc., and channel ID
    // to get Report API
    ContentNodeResource.getModel(contentNodeId).fetch(),
    // Get Learner Groups to display their names on table
    LearnerGroupResource.getCollection({ parent: classId }).fetch(),
    setClassState(store, classId),
  ];

  return Promise.all(loadRequirements)
    .then(([lesson, contentNode, learnerGroups]) => {
      store.dispatch('SET_CURRENT_LESSON', lesson);
      store.dispatch('SET_CURRENT_LESSON_RESOURCE', contentNode);
      store.dispatch('SET_LEARNER_GROUPS', learnerGroups);

      // Fetches progress for the *entire* class, but non-assigned learners
      // are filtered out below in the SET_LESSON_RESOURCE_REPORT mutation.
      return UserReportResource.getCollection({
        channel_id: contentNode.channel_id,
        collection_id: classId,
        collection_kind: CollectionTypes.CLASSROOM,
        content_node_id: contentNode.pk,
      }).fetch()._promise;
    })
    .then(report => {
      // NOTE: This mutation reads from pageState.currentLesson/learnerGroups
      //  set above to correctly filter out not-assigned Learners
      store.dispatch('SET_LESSON_RESOURCE_REPORT', report);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    })
    .catch(err => {
      console.log(err); // eslint-disable-line
    });
}
