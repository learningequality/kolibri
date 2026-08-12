import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';
import MembershipResource from 'kolibri-common/apiResources/MembershipResource';
import RoleResource from 'kolibri-common/apiResources/RoleResource';
import { handleApiError } from 'kolibri/utils/appError';

export function removeClassLearner(store, { classId, userId }) {
  if (!classId || !userId) {
    // if no id passed, abort the function
    return;
  }
  // fetch the membership model with this classId and userId.
  return MembershipResource.bulkDelete({
    user: userId,
    collection: classId,
  }).then(
    () => {
      store.commit('DELETE_CLASS_LEARNER', userId);
      store.dispatch('displayModal', false);
    },
    error => {
      handleApiError({ error });
    },
  );
}

export function removeClassCoach(store, { classId, userId }) {
  // TODO class id should be accessible from state.
  if (!classId || !userId) {
    // if no id passed, abort the function
    return;
  }
  // TODO use a getModel with role id? should be available. Might have to undo mappers
  // fetch the membership model with this classId and userId.
  return RoleResource.bulkDelete({
    user: userId,
    collection: classId,
  }).then(
    () => {
      store.commit('DELETE_CLASS_COACH', userId);
      store.dispatch('displayModal', false);
    },
    error => {
      handleApiError({ error });
    },
  );
}

/**
 * Renames a class and commits the change to the store.
 * `name` is the only class field this action can change, so the payload is already the diff.
 * @param {object} store - The Vuex store instance.
 * @param {object} payload - Payload object.
 * @param {string} payload.id - The ID of the class to update.
 * @param {string} payload.name - The new class name.
 * @returns {Promise<void>|void} Resolves when the class has been updated.
 */
export function updateClass(store, { id, name }) {
  if (!id || !name) {
    return;
  }
  return ClassroomResource.update(id, { name }).then(
    updatedClass => {
      store.commit('UPDATE_CLASS', { id, updatedClass });
      store.dispatch('displayModal', false);
    },
    error => {
      handleApiError({ error });
    },
  );
}
