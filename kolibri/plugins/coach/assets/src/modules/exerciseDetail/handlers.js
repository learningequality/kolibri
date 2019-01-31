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

// needs exercise, attemptlog. Pass answerstate into contentrender to display answer
export function showExerciseDetailView({
  learnerId,
  exerciseId,
  attemptId = null,
  interactionIndex = 0,
}) {
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
