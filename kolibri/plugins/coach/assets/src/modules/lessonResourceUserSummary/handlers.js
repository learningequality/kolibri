import find from 'lodash/find';
import { LessonResource, ContentNodeResource, LearnerGroupResource } from 'kolibri.resources';
import UserReportResource from '../../apiResources/userReport';
import { CollectionTypes, LessonsPageNames } from '../../constants/lessonsConstants';

/*
 * Shows the Lesson Resource Progress Report (all assigned learners vs. progress on resource).
 */
export function showLessonResourceUserSummaryPage(store, params) {
  const { classId, lessonId, contentId } = params;
  store.commit('CORE_SET_PAGE_LOADING', true);

  const loadRequirements = [
    // Used to get Lesson.learner_ids
    LessonResource.fetchModel({ id: lessonId }),
    // Get ContentNode to get the resource kind, title, etc., and channel ID for Report API
    ContentNodeResource.fetchModel({ id: contentId }),
    // Get group names
    LearnerGroupResource.fetchCollection({ getParams: { parent: classId } }),
  ];

  return Promise.all(loadRequirements)
    .then(([lesson, contentNode, learnerGroups]) => {
      const channelObject = store.getters.getChannelObject(contentNode.channel_id);
      const getLearnerGroup = userId => find(learnerGroups, g => g.user_ids.includes(userId)) || {};

      // IDEA filter by ids?
      return UserReportResource.fetchCollection({
        getParams: {
          channel_id: contentNode.channel_id,
          collection_id: classId,
          collection_kind: CollectionTypes.CLASSROOM,
          content_node_id: contentNode.id,
        },
      }).then(userReports => {
        const getUserReport = userId => find(userReports, { id: userId }) || {};
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

        store.commit('lessonResourceUserSummary/SET_STATE', {
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
