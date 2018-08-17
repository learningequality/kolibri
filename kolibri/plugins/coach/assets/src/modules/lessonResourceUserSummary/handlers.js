import { LessonResource, ContentNodeResource, LearnerGroupResource } from 'kolibri.resources';
import { LessonsPageNames } from '../../constants/lessonsConstants';

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

      store.commit('lessonResourceUserSummary/SET_STATE', {
        channelTitle: channelObject.title,
        resourceTitle: contentNode.title,
        resourceKind: contentNode.kind,
        contentNode: { ...contentNode },
        userData: {},
        learnerGroups,
        currentLesson: lesson,
      });

      // This needs to be called after SET_STATE since action depends learnerGroups
      // and currentLesson
      return store.dispatch('lessonResourceUserSummary/setUserData', {
        channelId: contentNode.channel_id,
        contentNodeId: contentNode.id,
        classId,
      });
    })
    .then(() => {
      store.commit('SET_TOOLBAR_ROUTE', { name: LessonsPageNames.SUMMARY });
      store.commit('SET_PAGE_NAME', LessonsPageNames.RESOURCE_USER_SUMMARY);
      store.commit('CORE_SET_PAGE_LOADING', false);
    })
    .catch(error => {
      store.commit('CORE_SET_PAGE_LOADING', false);
      return store.dispatch('handleApiError', error);
    });
}
