import {
  ContentNodeResource,
  ContentNodeSlimResource,
  ContentSummaryLogResource,
  FacilityUserResource,
} from 'kolibri.resources';
import LessonReportResource from '../../apiResources/lessonReport';
import { LessonsPageNames } from '../../constants/lessonsConstants';
import { PageNames } from '../../constants';

function preparePageNameAndTitle(store, pageName) {
  store.commit('SET_PAGE_NAME', pageName);
  store.commit('CORE_SET_PAGE_LOADING', true);
}

// Consolidates the duplicated logic for the item detail pages
function _showItemDetailPage(pageName, ...args) {
  const store = args[0];
  if (store.state.pageName !== pageName) {
    preparePageNameAndTitle(store, pageName);
  }
  return showExerciseDetailView(...args).then(exerciseDetailState => {
    store.commit('exerciseDetail/SET_STATE', exerciseDetailState);
    store.commit('CORE_SET_PAGE_LOADING', false);
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
        store.dispatch('setClassState', classId),
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

/* Refreshes the Lesson Report (resource vs. fraction of learners-who-completed-it)
 * data on the Lesson Summary Page.
 */
export function refreshLessonReport(store, lessonId) {
  LessonReportResource.fetchModel({ id: lessonId, force: true }).then(lessonReport => {
    store.commit('SET_LESSON_REPORT', lessonReport);
  });
}

/*
 * Shows the attempt log for an Exercise. Shares exerciseDetail module
 * with normal coach reports.
 */
export function showLessonResourceUserReportPage(store, params) {
  const { classId, contentId, userId, attemptLogIndex, interactionIndex } = params;
  store.commit('CORE_SET_PAGE_LOADING', true);
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
        store.commit('CORE_SET_PAGE_LOADING', false);
      });
    },
    error => {
      store.commit('CORE_SET_PAGE_LOADING', false);
      return store.dispatch('handleApiError', error);
    }
  );
}
