import { UserKinds, ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
import pickBy from 'lodash/pickBy';
import { FacilityUserResource } from 'kolibri.resources';
import CatchErrors from 'kolibri.utils.CatchErrors';
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
export function createUser(store, stateUserData) {
  // resolves with user object
  return FacilityUserResource.saveModel({
    data: {
      facility: store.rootState.core.session.facility_id,
      username: stateUserData.username,
      full_name: stateUserData.full_name,
      password: stateUserData.password,
    },
  }).then(userModel => {
    function dispatchUser(newUser) {
      const userState = _userState(newUser);
      store.commit('ADD_USER', userState);
      store.dispatch('displayModal', false);
      return userState;
    }
    // only runs if there's a role to be assigned
    if (stateUserData.role.kind !== UserKinds.LEARNER) {
      return setUserRole(userModel, stateUserData.role).then(user => dispatchUser(user));
    } else {
      // no role to assigned
      return dispatchUser(userModel);
    }
  });
}

/**
 * Do a PATCH to update existing user
 * @param {object} store
 * @param {string} userId
 * @param {object} updates Optional Changes: full_name, username, password, and kind(role)
 */
export function updateUser(store, { userId, updates }) {
  setError(store, null);
  store.commit('SET_BUSY', true);
  const origUserState = store.state.facilityUsers.find(user => user.id === userId);
  const facilityRoleHasChanged = updates.role && origUserState.kind !== updates.role.kind;

  return updateFacilityUser(store, { userId, updates })
    .then(updatedUser => {
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
    })
    .catch(error => {
      store.commit('SET_BUSY', false);
      const errorsCaught = CatchErrors(error, [ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS]);
      if (errorsCaught) {
        setError(store, errorsCaught);
      } else {
        store.dispatch('handleApiError', error, { root: true });
      }
    });
}

export function setError(store, error) {
  store.commit('SET_ERROR', error);
}

// Update fields on the FacilityUser model
// updates :: { full_name, username, password }
export function updateFacilityUser(store, { userId, updates }) {
  const origUserState = store.state.facilityUsers.find(user => user.id === userId);
  const changedValues = pickBy(
    updates,
    (value, key) => updates[key] && updates[key] !== origUserState[key]
  );
  const facilityUserHasChanged = Object.keys(changedValues).length > 0;
  if (facilityUserHasChanged) {
    return FacilityUserResource.saveModel({ id: userId, data: changedValues });
  }
  return Promise.resolve({
    ...origUserState,
    facility: origUserState.facility_id,
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
