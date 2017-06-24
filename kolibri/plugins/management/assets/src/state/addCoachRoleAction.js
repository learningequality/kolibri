/* eslint-disable prefer-arrow-callback */
import { RoleResource } from 'kolibri.resources';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import { samePageCheckGenerator } from 'kolibri.coreVue.vuex.actions';

const { COACH, LEARNER } = UserKinds;

export function dispatchError(store, err) {
  return store.dispatch('CORE_SET_ERROR', JSON.stringify(err.entity || err.message));
};

export function dispatchRoleChange(store, payload) {
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
export function addRoleToUserInCollection(payload) {
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
  dispatchRoleChange(store, { newRole, userId });
  return (
    ConditionalPromise.all([
      addRoleToUserInCollection({ collectionId: classId, newRole, userId }),
    ])
    .only(
      samePageCheckGenerator(store),
      function onSuccess() {},
      function onFailure(err) {
        if (err) {
          dispatchRoleChange(store, { newRole: LEARNER, userId });
          dispatchError(store, err);
        }
      }
    )
  );
};
