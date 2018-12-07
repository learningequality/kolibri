import { ClassroomResource } from 'kolibri.resources';

/**
 * Do a POST to create new class
 * @param {string} name
 */
export function createClass(store, name) {
  ClassroomResource.saveModel({
    data: {
      name,
      parent: store.rootState.core.session.facility_id,
    },
  }).then(
    classroom => {
      store.commit('ADD_CLASS', classroom);
      store.dispatch('displayModal', false);
    },
    error => {
      store.dispatch('handleApiError', error, { root: true });
    }
  );
}

/**
 * Do a DELETE to delete the class.
 * @param {string or Integer} id
 */
export function deleteClass(store, id) {
  if (!id) {
    // if no id passed, abort the function
    return;
  }
  return ClassroomResource.deleteModel({ id }).then(
    () => {
      store.commit('DELETE_CLASS', id);
      store.dispatch('displayModal', false);
    },
    error => {
      store.dispatch('handleApiError', error, { root: true });
    }
  );
}
