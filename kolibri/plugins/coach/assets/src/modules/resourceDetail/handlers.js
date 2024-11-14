import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import store from 'kolibri/store';

export function generateResourceHandler(paramsToCheck) {
  return function resourceHandler(to, from) {
    const { params } = to;
    const fromParams = from.params;
    const setLoading = paramsToCheck.some(param => params[param] !== fromParams[param]);
    if (setLoading) {
      // Only set loading state if we are not switching between
      // different views of the same learner's exercise report.
      store.dispatch('loading');
    }
    showResourceView(params).then(() => {
      // Set not loading regardless, as we are now
      // ready to render.
      store.dispatch('notLoading');
    });
  };
}

export function showResourceView({ resourceId, exerciseId } = {}) {
  // Passed in exerciseId is the content_id of the contentNode
  // Map this to the id of the content node to do this fetch
  const nodeId = store.state.classSummary.contentMap[resourceId || exerciseId].node_id;
  return ContentNodeResource.fetchModel({
    id: nodeId,
    getParams: { no_available_filtering: true },
  }).then(
    resource => {
      store.commit('resourceDetail/SET_STATE', {
        resource,
      });
    },
    error => {
      store.dispatch('handleCoachPageError', error);
    },
  );
}
