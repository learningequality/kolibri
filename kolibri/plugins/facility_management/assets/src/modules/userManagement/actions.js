import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import pickBy from 'lodash/pickBy';
import { FacilityUserResource } from 'kolibri.resources';
import { _userState } from '../mappers';
import { updateFacilityLevelRoles } from './utils';

/**
 * Does a POST request to assign a user role (only used in this file)
 * @param {Object} user
 * @param {string} user.id
 * @param {string} user.facility
 * @param {string} user.roles
 * Needed: id, facility, role
 */
function setUserRole(user, role) {
  return updateFacilityLevelRoles(user, role.kind).then(() => {
    // Force refresh the User to get updated roles
    return FacilityUserResource.fetchModel({ id: user.id, force: true });
  });
}

/**
 * Do a POST to create new user
 * @param {object} stateUserData
 *  Needed: username, full_name, facility, role, password
 */
export function createUser(store, payload) {
  return FacilityUserResource.saveModel({
    data: {
      facility: store.rootState.core.session.facility_id,
      username: payload.username,
      full_name: payload.full_name,
      password: payload.password,
      id_number: payload.id_number,
      gender: payload.gender,
      birth_year: payload.birth_year,
    },
  });
}

/**
 * Do a PATCH to update existing user
 * @param {object} store
 * @param {string} userId
 * @param {object} updates Optional Changes: full_name, username, password, and kind(role)
 */
export function updateUser(store, { userId, updates, original }) {
  setError(store, null);
  store.commit('SET_BUSY', true);
  const facilityRoleHasChanged = updates.role && original.kind !== updates.role.kind;

  return updateFacilityUser(store, { userId, updates, original }).then(updatedUser => {
    const update = userData => store.commit('UPDATE_USER', _userState(userData));
    if (facilityRoleHasChanged) {
      if (store.rootGetters.currentUserId === userId && store.rootGetters.isSuperuser) {
        // maintain superuser if updating self.
        store.commit('UPDATE_CURRENT_USER_KIND', [UserKinds.SUPERUSER, updates.role.kind], {
          root: true,
        });
      }
      return setUserRole(updatedUser, updates.role).then(userWithRole => {
        update(userWithRole);
      });
    } else {
      update(updatedUser);
    }
  });
}

export function setError(store, error) {
  store.commit('SET_ERROR', error);
}

// Update fields on the FacilityUser model
// updates :: { full_name, username, password }
export function updateFacilityUser(store, { userId, updates, original }) {
  if (!original) {
    original = store.state.facilityUsers.find(user => user.id === userId);
  }
  const changedValues = pickBy(
    updates,
    (value, key) => updates[key] && updates[key] !== original[key]
  );
  const facilityUserHasChanged = Object.keys(changedValues).length > 0;
  if (facilityUserHasChanged) {
    return FacilityUserResource.saveModel({ id: userId, data: changedValues });
  }
  return Promise.resolve({
    ...original,
    facility: original.facility_id,
  });
}

/**
 * Do a DELETE to delete the user.
 * @param {string or Integer} id
 */
export function deleteUser(store, id) {
  if (!id) {
    // if no id passed, abort the function
    return;
  }
  FacilityUserResource.deleteModel({ id }).then(
    () => {
      store.commit('DELETE_USER', id);
      store.dispatch('displayModal', false);
      if (store.rootState.core.session.user_id === id) {
        store.dispatch('kolibriLogout', { root: true });
      }
    },
    error => {
      store.dispatch('handleApiError', error, { root: true });
    }
  );
}
