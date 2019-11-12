import { ContentNodeResource } from 'kolibri.resources';
import store from 'kolibri.coreVue.vuex.store';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { fetchNodeDataAndConvertExam } from 'kolibri.utils.exams';
import { coachStrings } from '../../views/common/commonCoachStrings';

export function questionRootRedirectHandler(params, name, next) {
  return showQuestionDetailView(params).then(learnerId => {
    next({
      name: name,
      params: {
        ...params,
        learnerId,
        interactionIndex: 0,
      },
    });
  });
}

export function generateQuestionDetailHandler(paramsToCheck) {
  return function questionDetailHandler(to, from) {
    if (paramsToCheck.some(param => to.params[param] !== from.params[param])) {
      // Only set loading state if we are not switching between
      // different views of the same question's learner report.
      store.dispatch('loading');
    }
    showQuestionDetailView(to.params).then(() => {
      // Set not loading regardless, as we are now
      // ready to render.
      store.dispatch('notLoading');
    });
  };
}

function showQuestionDetailView(params) {
  const { exerciseId, learnerId, interactionIndex, questionId, quizId } = params;
  let promise;
  let exerciseNodeId;
  if (quizId) {
    // If this is showing for a quiz, then no exerciseId will be passed in
    // set the appropriate exerciseId here based on the question sources
    const baseExam = store.state.classSummary.examMap[quizId];
    promise = fetchNodeDataAndConvertExam(baseExam).then(exam => {
      exerciseNodeId = exam.question_sources.find(source => source.question_id === questionId)
        .exercise_id;
      return exam;
    });
  } else {
    // Passed in exerciseId is the content_id of the contentNode
    // Map this to the id of the content node to do this fetch
    exerciseNodeId = store.state.classSummary.contentMap[exerciseId].node_id;
    promise = Promise.resolve();
  }
  return promise
    .then(exam => {
      return ContentNodeResource.fetchModel({ id: exerciseNodeId }).then(exercise => {
        exercise.assessmentmetadata = assessmentMetaDataState(exercise);
        let title;
        if (exam) {
          const question = exam.question_sources.find(
            source => source.question_id === questionId && source.exercise_id === exerciseNodeId
          );
          title = coachStrings.$tr('nthExerciseName', {
            name: question.title,
            number: question.counter_in_exercise,
          });
        } else {
          const questionNumber = Math.max(
            1,
            exercise.assessmentmetadata.assessmentIds.indexOf(questionId)
          );
          title = coachStrings.$tr('nthExerciseName', {
            name: exercise.title,
            number: questionNumber,
          });
        }
        store.commit('questionDetail/SET_STATE', {
          learnerId,
          interactionIndex: Number(interactionIndex),
          questionId,
          title,
          exercise,
          exam,
        });
        return store
          .dispatch('questionDetail/setLearners', {
            ...params,
            exercise,
            exerciseNodeId,
          })
          .then(learners => {
            // No learnerId was passed in, so we should trigger a url redirect
            // to the first attempt.
            if (!learnerId) {
              return learners[0].id;
            }
          });
      });
    })
    .catch(error => {
      store.dispatch('handleCoachPageError', error);
    });
}
