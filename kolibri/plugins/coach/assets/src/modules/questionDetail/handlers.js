import { ContentNodeResource } from 'kolibri.resources';
import store from 'kolibri.coreVue.vuex.store';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { crossComponentTranslator } from 'kolibri.utils.i18n';
import AssessmentQuestionListItem from './../../views/plan/CreateExamPage/AssessmentQuestionListItem';

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
    const { params } = to;
    const fromParams = from.params;
    const setLoading = paramsToCheck.some(param => params[param] !== fromParams[param]);
    if (setLoading) {
      // Only set loading state if we are not switching between
      // different views of the same question's learner report.
      store.dispatch('loading');
    }
    showQuestionDetailView(params).then(() => {
      // Set not loading regardless, as we are now
      // ready to render.
      store.dispatch('notLoading');
    });
  };
}

function showQuestionDetailView(params) {
  let { exerciseId, learnerId, interactionIndex, questionId } = params;
  interactionIndex = Number(interactionIndex);
  // Passed in exerciseId is the content_id of the contentNode
  // Map this to the id of the content node to do this fetch
  exerciseId = store.state.classSummary.contentMap[exerciseId].node_id;
  return ContentNodeResource.fetchModel({ id: exerciseId }).then(
    exercise => {
      exercise.assessmentmetadata = assessmentMetaDataState(exercise);
      const questionNumber = Math.max(
        1,
        exercise.assessmentmetadata.assessmentIds.indexOf(questionId)
      );
      const title = crossComponentTranslator(AssessmentQuestionListItem).$tr('nthExerciseName', {
        name: exercise.title,
        number: questionNumber,
      });
      store.commit('questionDetail/SET_STATE', {
        learnerId,
        interactionIndex,
        questionId,
        title,
        exercise,
      });
      return store
        .dispatch('questionDetail/setLearners', {
          ...params,
          exercise,
        })
        .then(learners => {
          // No learnertId was passed in, so we should trigger a url redirect
          // to the first attempt.
          if (!learnerId) {
            return learners[0].id;
          }
        });
    },
    error => {
      store.dispatch('handleCoachPageError', error);
    }
  );
}
