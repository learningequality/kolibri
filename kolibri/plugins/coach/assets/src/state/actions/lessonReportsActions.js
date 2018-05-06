import find from 'lodash/find';
import { LessonResource, ContentNodeResource, LearnerGroupResource } from 'kolibri.resources';
import { getChannelObject } from 'kolibri.coreVue.vuex.getters';
import { handleApiError } from 'kolibri.coreVue.vuex.actions';
import LessonReportResource from '../../apiResources/lessonReport';
import UserReportResource from '../../apiResources/userReport';
import { CollectionTypes, LessonsPageNames } from '../../constants/lessonsConstants';
import { showExerciseDetailView } from './reports';

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
export function showLessonResourceUserSummaryPage(store, classId, lessonId, contentId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);

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
      const channelObject = getChannelObject(store.state, contentNode.channel_id);
      const getLearnerGroup = userId => find(learnerGroups, g => g.user_ids.includes(userId)) || {};

      // IDEA filter by ids?
      return UserReportResource.getCollection({
        channel_id: contentNode.channel_id,
        collection_id: classId,
        collection_kind: CollectionTypes.CLASSROOM,
        content_node_id: contentNode.pk,
      })
        .fetch()
        ._promise.then(userReports => {
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

          store.dispatch('SET_PAGE_STATE', {
            channelTitle: channelObject.title,
            resourceTitle: contentNode.title,
            resourceKind: contentNode.kind,
            contentNode: { ...contentNode },
            userData,
          });
          store.dispatch('CORE_SET_TITLE', contentNode.title);
          store.dispatch('SET_TOOLBAR_ROUTE', { name: LessonsPageNames.SUMMARY });
          store.dispatch('SET_PAGE_NAME', LessonsPageNames.RESOURCE_USER_SUMMARY);
          store.dispatch('CORE_SET_PAGE_LOADING', false);
        });
    })
    .catch(error => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      return handleApiError(store, error);
    });
}

/*
 * Shows the attempt log for an Exercise
 */
export function showLessonResourceUserReportPage(
  store,
  classId,
  lessonId,
  contentId,
  userId,
  questionNumber,
  interactionNumber
) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', LessonsPageNames.RESOURCE_USER_REPORT);
  store.dispatch('SET_PAGE_STATE', {
    toolbarRoute: { name: LessonsPageNames.RESOURCE_USER_SUMMARY },
  });
  ContentNodeResource.getModel(contentId)
    .fetch()
    .then(
      contentNode => {
        store.dispatch('CORE_SET_TITLE', contentNode.title);
        // NOTE: returning the result causes problems for some reason
        showExerciseDetailView(
          store,
          classId,
          userId,
          contentNode.channel_id,
          contentId,
          questionNumber,
          interactionNumber
        );
      },
      error => {
        store.dispatch('CORE_SET_PAGE_LOADING', false);
        return handleApiError(store, error);
      }
    );
}
