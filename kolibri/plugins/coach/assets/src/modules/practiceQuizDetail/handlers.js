import { ContentNodeResource } from 'kolibri.resources';
import store from 'kolibri.coreVue.vuex.store';

export function practiceQuizRootRedirectHandler(params, name, next, query) {
  return showPracticeQuizDetailView(params).then(attemptId => {
    next({
      name: name,
      params: {
        ...params,
        attemptId,
        interactionIndex: 0,
      },
      query,
    });
  });
}

export function generatePracticeQuizDetailHandler(paramsToCheck) {
  return function practiceQuizDetailHandler(to, from) {
    const { params } = to;
    const fromParams = from.params;
    const setLoading = paramsToCheck.some(param => params[param] !== fromParams[param]);
    if (setLoading) {
      // Only set loading state if we are not switching between
      // different views of the same learner's exercise report.
      store.dispatch('loading');
    }
    showPracticeQuizDetailView(params).then(() => {
      // Set not loading regardless, as we are now
      // ready to render.
      store.dispatch('notLoading');
    });
  };
}

// needs exercise, attemptlog. Pass answerstate into contentrender to display answer
function showPracticeQuizDetailView({
  learnerId,
  practiceQuizId,
  attemptId = null,
  interactionIndex = 0,
}) {
  interactionIndex = Number(interactionIndex);
  // Passed in exerciseId is the content_id of the contentNode
  // Map this to the id of the content node to do this fetch
  practiceQuizId = store.state.classSummary.contentMap[practiceQuizId].node_id;
  return ContentNodeResource.fetchModel({ id: practiceQuizId }).then(
    practiceQuiz => {
      store.commit('practiceQuizDetail/SET_STATE', {
        attemptId,
        practiceQuiz,
        interactionIndex,
        learnerId,
      });
      return store.dispatch('practiceQuizDetail/setAttemptLogs').then(attemptLogs => {
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
