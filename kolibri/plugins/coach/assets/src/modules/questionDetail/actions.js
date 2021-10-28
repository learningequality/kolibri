import { AttemptLogResource } from 'kolibri.resources';

export function setLearners(store, params) {
  const { questionId, exerciseId, quizId, classId, groupId, learnerId } = params;
  const getParams = {
    item: questionId,
    content: exerciseId,
  };
  if (quizId) {
    getParams.content = quizId;
  }
  if (classId) {
    getParams.classroom = classId;
  }
  if (groupId) {
    getParams.learner_group = groupId;
  }
  return AttemptLogResource.fetchCollection({
    getParams,
    force: !learnerId,
  }).then(attemptLogs => {
    let learners;
    // Add learner information to each attemptLog to turn this into
    // a list of learners with attempt information intermixed.
    if (quizId) {
      // For quizzes, run through all learners in the appropriate collection
      // So that we can show 'not attempted' in the sidebar for additional
      // info.
      learners = Object.values(store.rootState.classSummary.examLearnerStatusMap[quizId]).map(
        learner => {
          const returnLearner = {};
          const attemptLog = attemptLogs.find(log => log.user === learner.learner_id);
          if (attemptLog) {
            Object.assign(returnLearner, attemptLog);
          } else {
            Object.assign(returnLearner, {
              item: questionId.split(':')[1],
              noattempt: true,
            });
          }
          Object.assign(returnLearner, store.rootState.classSummary.learnerMap[learner.learner_id]);
          // This item value is used to pass into KContentRenderer to set the correct question,
          // so reclaim the actual item id value here by splitting on ':'.
          returnLearner.item = returnLearner.item.split(':')[1];
          return returnLearner;
        }
      );
    } else {
      // For exercises, only run through the learners with attempts
      learners = attemptLogs.map(attemptLog => {
        const learner = store.rootState.classSummary.learnerMap[attemptLog.user];
        return {
          ...attemptLog,
          ...learner,
        };
      });
    }

    learners = learners.filter(learner => !learner.correct);

    // Re-set the learner data.
    store.commit('SET_LEARNERS', learners);
    return store.getters.learners;
  });
}
