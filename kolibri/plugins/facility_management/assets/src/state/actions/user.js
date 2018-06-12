import pickBy from 'lodash/pickBy';
import { FacilityUserResource } from 'kolibri.resources';
import {
  samePageCheckGenerator,
  kolibriLogout,
  handleApiError,
} from 'kolibri.coreVue.vuex.actions';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import { currentUserId, isSuperuser, currentFacilityId } from 'kolibri.coreVue.vuex.getters';
import { PageNames } from '../../constants';
import { _userState, _managePageTitle } from './helpers/mappers';
import preparePage from './helpers/preparePage';
import displayModal from './helpers/displayModal';
import { updateFacilityLevelRoles } from './rolesActions';

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
    return FacilityUserResource.getModel(user.id).fetch({}, true);
  });
}

/**
 * Do a POST to create new user
 * @param {object} stateUserData
 *  Needed: username, full_name, facility, role, password
 */
export function createUser(store, stateUserData) {
  // resolves with user object
  return FacilityUserResource.createModel({
    facility: store.state.core.session.facility_id,
    username: stateUserData.username,
    full_name: stateUserData.full_name,
    password: stateUserData.password,
  })
    .save()
    .then(userModel => {
      function dispatchUser(newUser) {
        const userState = _userState(newUser);
        store.dispatch('ADD_USER', userState);
        // TODO to be removed
        store.dispatch('SET_USER_JUST_CREATED', userState);
        displayModal(store, false);
        return userState;
      }
      // only runs if there's a role to be assigned
      if (stateUserData.role.kind !== UserKinds.LEARNER) {
        return setUserRole(userModel, stateUserData.role).then(user => dispatchUser(user));
      } else {
        // no role to assigned
        return dispatchUser(userModel);
      }
    })
    .catch(error => handleApiError(error));
}

/**
 * Do a PATCH to update existing user
 * @param {object} store
 * @param {string} userId
 * @param {object} updates Optional Changes: full_name, username, password, and kind(role)
 */
export function updateUser(store, userId, updates) {
  store.dispatch('SET_ERROR', '');
  store.dispatch('SET_BUSY', true);
  const origUserState = store.state.pageState.facilityUsers.find(user => user.id === userId);
  const facilityRoleHasChanged = origUserState.kind !== updates.role.kind;

  return updateFacilityUser(store, { userId, updates }).then(
    updatedUser => {
      const update = userData => store.dispatch('UPDATE_USER', _userState(userData));
      if (facilityRoleHasChanged) {
        if (currentUserId(store.state) === userId && isSuperuser(store.state)) {
          // maintain superuser if updating self.
          store.dispatch('UPDATE_CURRENT_USER_KIND', [UserKinds.SUPERUSER, updates.role.kind]);
        }
        return setUserRole(updatedUser, updates.role).then(userWithRole => {
          update(userWithRole);
        });
      } else {
        update(updatedUser);
      }
    },
    error => {
      if (error.status.code === 400) {
        store.dispatch('SET_ERROR', Object.values(error.entity)[0][0]);
      } else if (error.status.code === 403) {
        store.dispatch('SET_ERROR', error.entity);
      }
      store.dispatch('SET_BUSY', false);
    }
  );
}

// Update fields on the FacilityUser model
// updates :: { full_name, username, password }
export function updateFacilityUser(store, { userId, updates }) {
  const origUserState = store.state.pageState.facilityUsers.find(user => user.id === userId);
  const changedValues = pickBy(
    updates,
    (value, key) => updates[key] && updates[key] !== origUserState[key]
  );
  const facilityUserHasChanged = Object.keys(changedValues).length > 0;

  if (facilityUserHasChanged) {
    return FacilityUserResource.getModel(userId).save(changedValues)._promise;
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
  FacilityUserResource.getModel(id)
    .delete()
    .then(
      () => {
        store.dispatch('DELETE_USER', id);
        displayModal(store, false);
        if (store.state.core.session.user_id === id) {
          kolibriLogout();
        }
      },
      error => {
        handleApiError(store, error);
      }
    );
}

// An action for setting up the initial state of the app by fetching data from the server
export function showUserPage(store) {
  preparePage(store.dispatch, {
    name: PageNames.USER_MGMT_PAGE,
    title: _managePageTitle('Users'),
  });

  const facilityId = currentFacilityId(store.state);

  FacilityUserResource.getCollection({ member_of: facilityId })
    .fetch({}, true)
    .only(
      samePageCheckGenerator(store),
      users => {
        store.dispatch('SET_PAGE_STATE', {
          facilityUsers: users.map(_userState),
          modalShown: false,
          error: '',
          isBusy: false,
        });
        store.dispatch('CORE_SET_PAGE_LOADING', false);
      },
      error => {
        handleApiError(store, error);
      }
    );
}
