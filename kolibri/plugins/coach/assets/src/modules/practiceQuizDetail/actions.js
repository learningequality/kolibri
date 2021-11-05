import { AttemptLogResource } from 'kolibri.resources';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';

export function setAttemptLogs(store) {
  const { learnerId, practiceQuiz, attemptId } = store.state;
  return AttemptLogResource.fetchCollection({
    getParams: {
      user: learnerId,
      content: practiceQuiz.content_id,
    },
    // Only force when accessing the root url
    force: attemptId === null,
  }).then(attemptLogs => {
    const practiceQuizQuestions = assessmentMetaDataState(practiceQuiz).assessmentIds;
    // Add their question number
    if (practiceQuizQuestions && practiceQuizQuestions.length) {
      attemptLogs.forEach(attemptLog => {
        attemptLog.questionNumber = practiceQuizQuestions.indexOf(attemptLog.item) + 1;
      });
    }
    // Re-set the attempt logs.
    store.commit('SET_ATTEMPT_LOGS', attemptLogs);
    return store.getters.attemptLogs;
  });
}
