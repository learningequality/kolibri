import {
  ContentNodeResource,
  ContentNodeSlimResource,
  ContentSummaryLogResource,
  FacilityUserResource,
} from 'kolibri.resources';
import { LessonsPageNames } from '../../constants/lessonsConstants';
import { PageNames } from '../../constants';

function preparePageNameAndTitle(store, pageName) {
  store.commit('SET_PAGE_NAME', pageName);
  store.dispatch('loading');
}

// Consolidates the duplicated logic for the item detail pages
function _showItemDetailPage(pageName, ...args) {
  const store = args[0];
  if (store.state.pageName !== pageName) {
    preparePageNameAndTitle(store, pageName);
  }
  return showExerciseDetailView(...args).then(exerciseDetailState => {
    store.commit('exerciseDetail/SET_STATE', exerciseDetailState);
    store.dispatch('notLoading');
  });
}

export function showLearnerItemDetails(...args) {
  _showItemDetailPage(PageNames.LEARNER_ITEM_DETAILS, ...args);
}

export function showRecentLearnerItemDetails(...args) {
  _showItemDetailPage(PageNames.RECENT_LEARNER_ITEM_DETAILS, ...args);
}

export function showTopicLearnerItemDetails(...args) {
  _showItemDetailPage(PageNames.TOPIC_LEARNER_ITEM_DETAILS, ...args);
}

// needs exercise, attemptlog. Pass answerstate into contentrender to display answer
export function showExerciseDetailView(
  store,
  classId,
  userId,
  channelId,
  contentId,
  attemptLogIndex,
  interactionIndex
) {
  return ContentNodeResource.fetchModel({ id: contentId }).then(
    exercise => {
      const promises = [
        store.dispatch('exerciseDetail/setAttemptLogs', {
          userId,
          exercise,
        }),
        ContentSummaryLogResource.fetchCollection({
          getParams: {
            user_id: userId,
            content_id: exercise.content_id,
          },
        }),
        FacilityUserResource.fetchModel({ id: userId }),
        ContentNodeSlimResource.fetchAncestors(contentId),
      ];
      return Promise.all(promises).then(([attemptLogs, summaryLog, user, ancestors]) => {
        Object.assign(exercise, { ancestors });
        return {
          attemptLogIndex,
          attemptLogs,
          exercise,
          interactionIndex,
          summaryLog: summaryLog[0],
          user,
          channelId,
        };
      });
    },
    error => {
      store.dispatch('handleCoachPageError', error);
    }
  );
}

/*
 * Shows the attempt log for an Exercise. Shares exerciseDetail module
 * with normal coach reports.
 */
export function showLessonResourceUserReportPage(store, params) {
  const { classId, contentId, userId, attemptLogIndex, interactionIndex } = params;
  store.dispatch('loading');
  store.commit('SET_PAGE_NAME', LessonsPageNames.RESOURCE_USER_REPORT);
  store.commit('SET_TOOLBAR_ROUTE', { name: LessonsPageNames.RESOURCE_USER_SUMMARY });
  return ContentNodeResource.fetchModel({ id: contentId }).then(
    contentNode => {
      // NOTE: returning the result causes problems for some reason
      showExerciseDetailView(
        store,
        classId,
        userId,
        contentNode.channel_id,
        contentId,
        Number(attemptLogIndex),
        Number(interactionIndex)
      ).then(reportState => {
        store.commit('exerciseDetail/SET_STATE', reportState);
        store.dispatch('notLoading');
      });
    },
    error => {
      store.dispatch('notLoading');
      return store.dispatch('handleApiError', error);
    }
  );
}
