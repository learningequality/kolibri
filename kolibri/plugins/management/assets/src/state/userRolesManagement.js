const { RoleResource } = require('kolibri').resources;

/**
 * Assigns a Role to a FacilityUser in the context of a Collection.
 * @param {Object} payload
 * @param {string} payload.userId
 * @param {string} payload.collectionId
 * @param {string} payload.userRole - maps to `kind`
 * @returns {Promise}
 */
export function assignRoleToUserInCollection(payload) {
  return RoleResource.createModel({
    user: payload.userId,
    collection: payload.collectionId,
    kind: payload.userRole,
  }).save();
}

/**
 * Update a Learner's role in the context of a Class.
 * A Learner User can be a 'Learner' or a 'Coach' in a given class.
 */
export function updateLearnerRoleInClass() {
  // create the Role Model
  return 0;
}
