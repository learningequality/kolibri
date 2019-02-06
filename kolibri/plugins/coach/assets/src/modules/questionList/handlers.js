import store from 'kolibri.coreVue.vuex.store';

export function generateQuestionListHandler(paramsToCheck) {
  return function questionListHandler(to, from) {
    const { params } = to;
    const fromParams = from.params;
    const setLoading = paramsToCheck.some(param => params[param] !== fromParams[param]);
    if (setLoading) {
      // Only set loading state if we are not switching
      store.dispatch('loading');
    }
    showQuestionListView(params).then(() => {
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
