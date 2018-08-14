import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { AttemptLogResource } from 'kolibri.resources';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';

export function setAttemptLogs(store, params) {
  const { userId, exercise, shouldSetAttemptLogs = false } = params;
  const isSamePage = params.isSamePage || samePageCheckGenerator(store);
  return AttemptLogResource.fetchCollection({
    getParams: {
      user: userId,
      content: exercise.content_id,
    },
    force: true,
  }).then(attemptLogs => {
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

    // When in refresh mode, actually re-set the attempt logs.
    if (shouldSetAttemptLogs && isSamePage()) {
      store.commit('SET_ATTEMPT_LOGS', attemptLogs);
    }
    // When report is initially loaded, the resolved attemptLogs is used in SET_STATE.
    return attemptLogs;
  });
}
