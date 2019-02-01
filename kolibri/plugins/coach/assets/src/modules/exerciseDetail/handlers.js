import { ContentNodeResource } from 'kolibri.resources';
import store from 'kolibri.coreVue.vuex.store';

export function rootRedirectHandler(params, name, next) {
  return showExerciseDetailView(params).then(attemptId => {
    next({
      name: name,
      params: {
        ...params,
        attemptId,
        interactionIndex: 0,
      },
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
function showExerciseDetailView({ learnerId, exerciseId, attemptId = null, interactionIndex = 0 }) {
  interactionIndex = Number(interactionIndex);
  return ContentNodeResource.fetchModel({ id: exerciseId }).then(
    exercise => {
      store.commit('exerciseDetail/SET_STATE', {
        attemptId,
        exercise,
        interactionIndex,
        learnerId,
      });
      return store
        .dispatch('exerciseDetail/setAttemptLogs', {
          learnerId,
          exercise,
        })
        .then(attemptLogs => {
          // No attemptId was passed in, so we should trigger a url redirect
          // to the first attempt.
          if (attemptId === null) {
            return attemptLogs[0].id;
          }
        });
    },
    error => {
      store.dispatch('handleCoachPageError', error);
    }
  );
}
