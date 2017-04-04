/* eslint-disable prefer-arrow-callback */
const { RoleResource } = require('kolibri').resources;
const { COACH, LEARNER } = require('kolibri.coreVue.vuex.constants').UserKinds;
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const { samePageCheckGenerator } = require('kolibri.coreVue.vuex.actions');

exports.dispatchError = function dispatchError(store, err) {
  return store.dispatch('CORE_SET_ERROR', JSON.stringify(err.entity || err.message));
};

exports.dispatchRoleChange = function dispatchRoleChange(store, payload) {
  store.dispatch('UPDATE_LEARNER_ROLE_FOR_CLASS', payload);
};

/**
 * Adds a Role to a User in the context of a Collection
 * Generalizes simililar Role factories that use Facility as Collection concept
 * This is not an idempotent action. If you try to do the same thing twice, you get an Error.
 * @param {Object} payload
 * @param {string} payload.userId
 * @param {string} payload.collectionId
 * @param {string} payload.newRole
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
exports.default = function addCoachRoleAction(store, payload) {
  const { classId, userId } = payload;
  const newRole = COACH;
  exports.dispatchRoleChange(store, { newRole, userId });
  return (
    ConditionalPromise.all([
      addRoleToUserInCollection({ collectionId: classId, newRole, userId }),
    ])
    .only(
      samePageCheckGenerator(store),
      function onSuccess() {},
      function onFailure(err) {
        if (err) {
          exports.dispatchRoleChange(store, { newRole: LEARNER, userId });
          exports.dispatchError(store, err);
        }
      }
    )
  );
};
