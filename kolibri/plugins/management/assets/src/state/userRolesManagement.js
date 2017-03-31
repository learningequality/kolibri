import * as coreApp from 'kolibri';
import * as constants from 'kolibri.coreVue.vuex.constants';

const { RoleResource, FacilityUserResource } = coreApp.resources;
const { COACH, LEARNER } = constants.UserKinds;

/**
 * Adds a Role to a User in the context of a Collection
 * @param {Object} payload
 * @param {string} payload.userId
 * @param {string} payload.collectionId
 * @param {string} payload.userRole - maps to `kind`
 * @returns {Promise}
 */
export function addRoleToUserInCollection(payload) {
  return RoleResource.createModel({
    user: payload.userId,
    collection: payload.collectionId,
    kind: payload.userRole,
  }).save();
}

/**
 * Adds the 'coach' role to a learner in a Class and updates store accordingly
 * @param {Object} payload
 * @param {string} payload.userId
 * @param {string} payload.classId
 * @returns {Promise}
 */
export function addCoachRoleAction(store, payload) {
  addRoleToUserInCollection({
    userId: payload.userId,
    collectionId: payload.classId,
    userRole: COACH,
  }).then(() => {
    store.dispatch('UPDATE_LEARNER_ROLE_FOR_CLASS', {
      userId: payload.userId,
      newRole: COACH,
    });
  });
}
