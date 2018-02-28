import { LessonResource, ContentNodeResource, LearnerGroupResource } from 'kolibri.resources';
import { showExerciseDetailView } from './reports.js';
import LessonReportResource from '../../apiResources/lessonReport';
import UserReportResource from '../../apiResources/userReport';
import { CollectionTypes, LessonsPageNames } from '../../lessonsConstants';
import { getChannelObject } from 'kolibri.coreVue.vuex.getters';

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
    // used for list of existing users
    LessonResource.getModel(lessonId).fetch(),
    // Get ContentNode to get the resource kind, title, etc., and channel ID
    // to get Report API
    ContentNodeResource.getModel(contentId).fetch(),
    // Get group names
    // QUESTION can we pass in an array of id's like contentNode?
    LearnerGroupResource.getCollection({ parent: classId }).fetch(),
  ];

  return Promise.all(loadRequirements)
    .then(([lesson, contentNode, learnerGroups]) => {
      const channelObject = getChannelObject(store.state, contentNode.channel_id);
      const channelTitle = channelObject.title;
      const resourceTitle = contentNode.title;
      const resourceKind = contentNode.kind;

      // IDEA filter by ids?
      UserReportResource.getCollection({
        channel_id: contentNode.channel_id,
        collection_id: classId,
        collection_kind: CollectionTypes.CLASSROOM,
        content_node_id: contentNode.pk,
      })
        .fetch()
        .then(classReports => {
          // Contains all information needed in template
          const userData = lesson.learner_ids.map(learnerId => {
            // attach group object to each learner in this resource
            const learnerGroup =
              learnerGroups.find(group => group.user_ids.includes(learnerId)) || {};

            // add progress, full_name, last_active
            const learnerReport = classReports.find(report => report.pk === learnerId) || {};

            return {
              id: learnerId,
              name: learnerReport.full_name,
              lastActive: learnerReport.last_active,
              groupName: learnerGroup.name,
              // make sure this will always exist?
              progress: learnerReport.progress[0].total_progress,
            };
          });

          store.dispatch('SET_PAGE_STATE', {
            channelTitle,
            resourceTitle,
            resourceKind,
            userData,
          });
          store.dispatch('SET_TOOLBAR_ROUTE', { name: LessonsPageNames.SUMMARY });
          store.dispatch('SET_PAGE_NAME', LessonsPageNames.RESOURCE_USER_SUMMARY);
          store.dispatch('CORE_SET_PAGE_LOADING', false);
        });
    })
    .catch(() => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}

/* eslint-disable no-unused-vars */
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
  // TODO set title
  ContentNodeResource.getModel(contentId)
    .fetch()
    .then(contentNode => {
      showExerciseDetailView(
        store,
        classId,
        userId,
        contentNode.channel_id,
        contentId,
        questionNumber,
        interactionNumber
      );
    });
}
