import { ClassroomResource, MembershipResource, RoleResource } from 'kolibri.resources';

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
      store.dispatch('handleApiError', error, { root: true });
    }
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
  return RoleResource.deleteCollection({
    user: userId,
    collection: classId,
  }).then(
    () => {
      store.commit('DELETE_CLASS_COACH', userId);
      store.dispatch('displayModal', false);
    },
    error => {
      store.dispatch('handleApiError', error, { root: true });
    }
  );
}

/**
 * Do a PATCH to update the class.
 * @param {string} id - class id.
 * @param {object} updateData.
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
      store.dispatch('handleApiError', error, { root: true });
    }
  );
}
