import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import store from 'kolibri/store';

export function exerciseRootRedirectHandler(params, name, next, query) {
  return showExerciseDetailView(params).then(() => {
    next({
      name: name,
      params: {
        ...params,
        questionId: 0,
        tryIndex: 0,
        interactionIndex: 0,
      },
      query,
    });
  });
}

export function generateExerciseDetailHandler(paramsToCheck) {
  return function exerciseDetailHandler(to, from) {
    const { params } = to;
    const fromParams = from.params;
    const setLoading = paramsToCheck.some(param => params[param] !== fromParams[param]);
    if (setLoading) {
      // Only set loading state if we are not switching between
      // different views of the same learner's exercise report.
      store.dispatch('loading');
    }
    showExerciseDetailView(params).then(() => {
      // Set not loading regardless, as we are now
      // ready to render.
      store.dispatch('notLoading');
    });
  };
}

// needs exercise, attemptlog. Pass answerstate into contentrender to display answer
function showExerciseDetailView({
  learnerId,
  exerciseId,
  questionId = 0,
  tryIndex = 0,
  interactionIndex = 0,
} = {}) {
  tryIndex = Number(tryIndex);
  interactionIndex = Number(interactionIndex);
  questionId = Number(questionId);
  // Passed in exerciseId is the content_id of the contentNode
  // Map this to the id of the content node to do this fetch
  exerciseId = store.state.classSummary.contentMap[exerciseId].node_id;
  return ContentNodeResource.fetchModel({ id: exerciseId }).then(
    exercise => {
      store.commit('exerciseDetail/SET_STATE', {
        questionId,
        exercise,
        interactionIndex,
        tryIndex,
        learnerId,
      });
    },
    error => {
      store.dispatch('handleCoachPageError', error);
    },
  );
}
