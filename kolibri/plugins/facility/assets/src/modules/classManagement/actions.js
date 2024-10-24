import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';

/**
 * Do a POST to create new class
 * @param {string} name
 */
export function createClass(store, name) {
  return ClassroomResource.saveModel({
    data: {
      name,
      parent: store.rootGetters.activeFacilityId,
    },
  }).then(
    classroom => {
      store.commit('ADD_CLASS', classroom);
    },
    error => {
      store.dispatch('handleApiError', { error }, { root: true });
    },
  );
}
