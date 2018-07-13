import find from 'lodash/find';
import { LessonResource, ContentNodeResource, LearnerGroupResource } from 'kolibri.resources';
import LessonReportResource from '../../apiResources/lessonReport';
import UserReportResource from '../../apiResources/userReport';
import { CollectionTypes, LessonsPageNames } from '../../constants/lessonsConstants';
import { showExerciseDetailView } from './reports';

/* Refreshes the Lesson Report (resource vs. fraction of learners-who-completed-it)
 * data on the Lesson Summary Page.
 */
export function refreshLessonReport(store, lessonId) {
  LessonReportResource.getModel(lessonId)
    .fetch(true)
    .then(lessonReport => {
      store.commit('SET_LESSON_REPORT', lessonReport);
    });
}

/*
 * Shows the Lesson Resource Progress Report (all assigned learners vs. progress on resource).
 */
export function showLessonResourceUserSummaryPage(store, params) {
  const { classId, lessonId, contentId } = params;
  store.commit('CORE_SET_PAGE_LOADING', true);

  const loadRequirements = [
    // Used to get Lesson.learner_ids
    LessonResource.getModel(lessonId).fetch(),
    // Get ContentNode to get the resource kind, title, etc., and channel ID for Report API
    ContentNodeResource.getModel(contentId).fetch(),
    // Get group names
    LearnerGroupResource.getCollection({ parent: classId }).fetch(),
  ];

  return Promise.all(loadRequirements)
    .then(([lesson, contentNode, learnerGroups]) => {
      const channelObject = store.getters.getChannelObject(contentNode.channel_id);
      const getLearnerGroup = userId => find(learnerGroups, g => g.user_ids.includes(userId)) || {};

      // IDEA filter by ids?
      return UserReportResource.getCollection({
        channel_id: contentNode.channel_id,
        collection_id: classId,
        collection_kind: CollectionTypes.CLASSROOM,
        content_node_id: contentNode.pk,
      })
        .fetch()
        .then(userReports => {
          const getUserReport = userId => find(userReports, { pk: userId }) || {};
          const userData = lesson.learner_ids.map(learnerId => {
            const { full_name, last_active, progress } = getUserReport(learnerId);
            return {
              id: learnerId,
              name: full_name,
              lastActive: last_active,
              groupName: getLearnerGroup(learnerId).name,
              progress: progress[0].total_progress,
            };
          });

          store.commit('SET_PAGE_STATE', {
            channelTitle: channelObject.title,
            resourceTitle: contentNode.title,
            resourceKind: contentNode.kind,
            contentNode: { ...contentNode },
            userData,
          });
          store.commit('SET_TOOLBAR_ROUTE', { name: LessonsPageNames.SUMMARY });
          store.commit('SET_PAGE_NAME', LessonsPageNames.RESOURCE_USER_SUMMARY);
          store.commit('CORE_SET_PAGE_LOADING', false);
        });
    })
    .catch(error => {
      store.commit('CORE_SET_PAGE_LOADING', false);
      return store.dispatch('handleApiError', error);
    });
}

/*
 * Shows the attempt log for an Exercise
 */
export function showLessonResourceUserReportPage(store, params) {
  const { classId, contentId, userId, questionNumber, interactionNumber } = params;
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', LessonsPageNames.RESOURCE_USER_REPORT);
  store.commit('SET_PAGE_STATE', {
    toolbarRoute: { name: LessonsPageNames.RESOURCE_USER_SUMMARY },
  });
  ContentNodeResource.getModel(contentId)
    .fetch()
    .then(
      contentNode => {
        // NOTE: returning the result causes problems for some reason
        showExerciseDetailView(
          store,
          classId,
          userId,
          contentNode.channel_id,
          contentId,
          Number(questionNumber),
          Number(interactionNumber)
        );
      },
      error => {
        store.commit('CORE_SET_PAGE_LOADING', false);
        return store.dispatch('handleApiError', error);
      }
    );
}
