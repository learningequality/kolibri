import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';
import { handleApiError } from 'kolibri/utils/appError';
import { selectedFacilityId } from 'kolibri-common/composables/useFacility';

/**
 * Creates a new class with the given name and adds it to the store.
 * @param {object} store - The Vuex store instance.
 * @param {string} name - The name for the new class.
 * @returns {Promise<void>} Resolves when the class has been created.
 */
export function createClass(store, name) {
  return ClassroomResource.saveModel({
    data: {
      name,
      parent: selectedFacilityId.value,
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
