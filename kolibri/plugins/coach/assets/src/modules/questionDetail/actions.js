import get from 'lodash/get';
import Modalities from 'kolibri-constants/Modalities';
import AttemptLogResource from 'kolibri-common/apiResources/AttemptLogResource';

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
  const practiceQuiz =
    exerciseId &&
    get(store.rootState.classSummary.contentMap[exerciseId], ['options', 'modality']) ===
      Modalities.QUIZ;
  return AttemptLogResource.fetchCollection({
    getParams,
    force: !learnerId,
  }).then(attemptLogs => {
    let learners;
    // Add learner information to each attemptLog to turn this into
    // a list of learners with attempt information intermixed.
    if (quizId || practiceQuiz) {
      // For quizzes, run through all learners in the appropriate collection
      // So that we can show 'not attempted' in the sidebar for additional
      // info.
      if (practiceQuiz) {
        if (groupId) {
          // If for a group just show learners in the group
          learners = store.getters.getLearnersForGroups([groupId]);
        } else {
          // Otherwise just get all the learners in the class
          learners = Object.keys(store.rootState.classSummary.learnerMap);
        }
        learners = learners.map(learner_id => ({ learner_id }));
      } else {
        learners = Object.values(store.rootState.classSummary.examLearnerStatusMap[quizId]);
      }
      learners = learners.map(learner => {
        const returnLearner = {};
        const attemptLog = attemptLogs.find(log => log.user === learner.learner_id);
        if (attemptLog) {
          Object.assign(returnLearner, attemptLog);
        } else {
          Object.assign(returnLearner, {
            item: questionId,
            noattempt: true,
          });
        }
        returnLearner.item = returnLearner.item.split(':')[1] || returnLearner.item;
        Object.assign(returnLearner, store.rootState.classSummary.learnerMap[learner.learner_id]);
        return returnLearner;
      });
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
