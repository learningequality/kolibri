import { AttemptLogResource } from 'kolibri.resources';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';

export function setAttemptLogs(store) {
  const { learnerId, exercise, attemptId } = store.state;
  return AttemptLogResource.fetchCollection({
    getParams: {
      user: learnerId,
      content: exercise.content_id,
    },
    // Only force when accessing the root url
    force: attemptId === null,
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
