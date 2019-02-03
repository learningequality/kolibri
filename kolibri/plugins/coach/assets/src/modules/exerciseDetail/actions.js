import { AttemptLogResource } from 'kolibri.resources';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';

export function setAttemptLogs(store, params) {
  const { userId, exercise } = params;
  return AttemptLogResource.fetchCollection({
    getParams: {
      user: userId,
      content: exercise.content_id,
    },
    force: true,
  }).then(attemptLogs => {
    const exerciseQuestions = assessmentMetaDataState(exercise).assessmentIds;
    // Add their question number
    if (exerciseQuestions && exerciseQuestions.length) {
      attemptLogs.forEach(attemptLog => {
        attemptLog.questionNumber = exerciseQuestions.indexOf(attemptLog.item) + 1;
      });
    }

    // Re-set the attempt logs.
    store.commit('SET_ATTEMPT_LOGS', attemptLogs);
    return store.getters.attemptLogs;
  });
}
