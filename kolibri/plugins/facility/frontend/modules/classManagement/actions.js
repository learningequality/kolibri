import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';
import { handleApiError } from 'kolibri/utils/appError';

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
      handleApiError({ error });
    },
  );
}
