/* eslint-disable prefer-arrow-callback */
import * as coreApp from 'kolibri';
import * as constants from 'kolibri.coreVue.vuex.constants';

const { RoleResource } = coreApp.resources;
const { COACH } = constants.UserKinds;

export function dispatchError(store, err) {
  console.error(err); // eslint-disable-line
  return store.dispatch('CORE_SET_ERROR', JSON.stringify(err.entity || err.message));
}

export function dispatchRoleChange(store, payload) {
  store.dispatch('UPDATE_LEARNER_ROLE_FOR_CLASS', payload);
}

/**
 * Adds a Role to a User in the context of a Collection
 * Generalizes simililar Role factories that use Facility as Collection concept
 * This is not an idempotent action. If you try to do the same thing twice, you get an Error.
 * @param {Object} payload
 * @param {string} payload.userId
 * @param {string} payload.collectionId
 * @param {string} payload.newRole - maps to `kind`
 * @returns {Promise}
 */
function addRoleToUserInCollection(payload) {
  return RoleResource.createModel({
    user: payload.userId,
    collection: payload.collectionId,
    kind: payload.newRole,
  }).save();
}

/**
 * Vuex action that adds the 'coach' role to a Learner in a Class and updates store accordingly
 * @param {Object} payload
 * @param {string} payload.userId
 * @param {string} payload.classId
 * @returns {Promise}
 */
export default function addCoachRoleAction(store, payload) {
  const { classId, userId } = payload;
  const newRole = COACH;
  return (
    addRoleToUserInCollection({
      collectionId: classId,
      newRole,
      userId,
    })
    .then(function onSuccess() {
      dispatchRoleChange(store, { newRole, userId });
    })
    .catch(function onFailure(err) {
      dispatchError(store, err);
    })
  );
}
