import store from 'kolibri/store';
import { showResourceView } from '../resourceDetail/handlers';

export function generateQuestionListHandler(paramsToCheck) {
  return function questionListHandler(to, from) {
    if (paramsToCheck.some(param => to.params[param] !== from.params[param])) {
      // Only set loading state if we are not switching
      store.dispatch('loading');
    }
    const { exerciseId } = to.params;
    Promise.all([
      exerciseId ? showResourceView({ exerciseId }) : Promise.resolve(),
      showQuestionListView(to.params),
    ]).then(() => {
      // Set not loading regardless, as we are now
      // ready to render.
      store.dispatch('notLoading');
    });
  };
}

function showQuestionListView(params) {
  return store
    .dispatch('questionList/setItemStats', {
      ...params,
    })
    .catch(error => {
      store.dispatch('handleCoachPageError', error);
    });
}
