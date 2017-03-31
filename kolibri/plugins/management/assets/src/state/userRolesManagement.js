import * as coreApp from 'kolibri';
import * as constants from 'kolibri.coreVue.vuex.constants';

const { RoleResource } = coreApp.resources;
const { COACH } = constants.UserKinds;

export const UPDATE_LEARNER_ROLE_FOR_CLASS = 'UPDATE_LEARNER_ROLE_FOR_CLASS';

export function formatError(err) {
  if (err.entity) {
    return JSON.stringify(err.entity);
  }
  return JSON.stringify(err.message);
}

/**
 * Adds a Role to a User in the context of a Collection
 * Generalizes simililar Role factories that use Facility as Collection concept
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
 * Adds the 'coach' role to a learner in a Class and updates store accordingly
 * @param {Object} payload
 * @param {string} payload.userId
 * @param {string} payload.classId
 * @returns {Promise}
 */
export default function addCoachRoleAction(store, payload) {
  return (
    addRoleToUserInCollection({
      collectionId: payload.classId,
      newRole: COACH,
      userId: payload.userId,
    })
    .then(() => {
      store.dispatch(UPDATE_LEARNER_ROLE_FOR_CLASS, {
        newRole: COACH,
        userId: payload.userId,
      });
    })
    .catch((err) => {
      store.dispatch('CORE_SET_ERROR', formatError(err));
    })
  );
}
