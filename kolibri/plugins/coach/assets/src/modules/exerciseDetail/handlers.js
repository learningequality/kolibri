import {
  AttemptLogResource,
  ContentNodeResource,
  ContentNodeSlimResource,
  ContentSummaryLogResource,
  FacilityUserResource,
} from 'kolibri.resources';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
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
      return Promise.all([
        AttemptLogResource.fetchCollection({
          getParams: {
            user: userId,
            content: exercise.content_id,
          },
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
      ]).then(([attemptLogs, summaryLog, user, ancestors]) => {
        attemptLogs.sort(
          (attemptLog1, attemptLog2) =>
            new Date(attemptLog2.end_timestamp) - new Date(attemptLog1.end_timestamp)
        );
        const exerciseQuestions = assessmentMetaDataState(exercise).assessmentIds;
        // SECOND LOOP: Add their question number
        if (exerciseQuestions && exerciseQuestions.length) {
          attemptLogs.forEach(attemptLog => {
            attemptLog.questionNumber = exerciseQuestions.indexOf(attemptLog.item) + 1;
          });
        }

        const currentAttemptLog = attemptLogs[attemptLogIndex] || {};
        let currentInteractionHistory = currentAttemptLog.interaction_history || [];
        // filter out interactions without answers but keep hints and errors
        currentInteractionHistory = currentInteractionHistory.filter(interaction =>
          Boolean(interaction.answer || interaction.type === 'hint' || interaction.type === 'error')
        );
        Object.assign(exercise, { ancestors });
        return {
          // because this is info returned from a collection
          user,
          exercise,
          attemptLogs,
          currentAttemptLog,
          interactionIndex,
          currentInteractionHistory,
          currentInteraction: currentInteractionHistory[interactionIndex],
          summaryLog: summaryLog[0],
          channelId, // not really needed
          attemptLogIndex,
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
