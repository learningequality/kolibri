import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';
import MembershipResource from 'kolibri-common/apiResources/MembershipResource';
import RoleResource from 'kolibri-common/apiResources/RoleResource';
import { handleApiError } from 'kolibri/utils/appError';

/**
 * Removes a learner from a class by deleting their membership.
 * @param {object} store - The Vuex store instance.
 * @param {object} root0 - Payload object.
 * @param {string} root0.classId - The ID of the class to remove the learner from.
 * @param {string} root0.userId - The ID of the learner to remove.
 * @returns {Promise<void>|void} Resolves when the learner has been removed.
 */
export function removeClassLearner(store, { classId, userId }) {
  if (!classId || !userId) {
    // if no id passed, abort the function
    return;
  }
  // fetch the membership model with this classId and userId.
  return MembershipResource.deleteCollection({
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

/**
 * Removes a coach from a class by deleting their role.
 * @param {object} store - The Vuex store instance.
 * @param {object} root0 - Payload object.
 * @param {string} root0.classId - The ID of the class to remove the coach from.
 * @param {string} root0.userId - The ID of the coach to remove.
 * @returns {Promise<void>|void} Resolves when the coach has been removed.
 */
export function removeClassCoach(store, { classId, userId }) {
  // TODO class id should be accessible from state.
  if (!classId || !userId) {
    // if no id passed, abort the function
    return;
  }
  // TODO use a getModel with role id? should be available. Might have to undo mappers
  // fetch the membership model with this classId and userId.
  return RoleResource.deleteCollection({
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
 * Updates a class with the given data and commits the change to the store.
 * @param {object} store - The Vuex store instance.
 * @param {object} root0 - Payload object.
 * @param {string} root0.id - The ID of the class to update.
 * @param {object} root0.updateData - The data to update on the class.
 * @returns {Promise<void>|void} Resolves when the class has been updated.
 */
export function updateClass(store, { id, updateData }) {
  if (!id || Object.keys(updateData).length === 0) {
    // if no id or empty updateData passed, abort the function
    return;
  }
  return ClassroomResource.saveModel({
    id,
    data: updateData,
  }).then(
    updatedClass => {
      store.commit('UPDATE_CLASS', { id, updatedClass });
      store.dispatch('displayModal', false);
    },
    error => {
      handleApiError({ error });
    },
  );
}
