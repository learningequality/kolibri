/* eslint-env node */
import { FacilityUserResource, RoleResource } from 'kolibri.resources';

import {
  samePageCheckGenerator,
  kolibriLogout,
  handleApiError,
} from 'kolibri.coreVue.vuex.actions';

import { UserKinds } from 'kolibri.coreVue.vuex.constants';

import { PageNames } from '../../constants';

import { _userState, _managePageTitle } from './helpers/mappers';
import preparePage from './helpers/preparePage';
import displayModal from './helpers/displayModal';

/**
 * Does a POST request to assign a user role (only used in this file)
 * @param {Object} user
 * @param {string} user.id
 * @param {string} user.facility
 * @param {string} user.kind
 * Needed: id, facility, kind
 */
function assignUserRole(user, kind) {
  return RoleResource.createModel({
    user: user.id,
    collection: user.facility,
    kind,
  })
    .save()
    .then(roleModel => {
      // add role to user's attribute here to limit API call
      user.roles.push(roleModel);
      return user;
    })
    .catch(error => handleApiError(error));
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
      if (stateUserData.kind !== UserKinds.LEARNER) {
        return assignUserRole(userModel, stateUserData.kind).then(user => dispatchUser(user));
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
 * @param {object} userUpdates Optional Changes: full_name, username, password, and kind(role)
 */
export function updateUser(store, userId, userUpdates) {
  store.dispatch('SET_ERROR', '');
  store.dispatch('SET_BUSY', true);
  const savedUserModel = FacilityUserResource.getModel(userId);
  const savedUser = savedUserModel.attributes;

  // explicit checks for the only values that can be changed
  const origUserState = store.state.pageState.facilityUsers.find(user => user.id === userId);
  const changedValues = {};
  if (userUpdates.full_name && userUpdates.full_name !== origUserState.full_name) {
    changedValues.full_name = userUpdates.full_name;
  }
  if (userUpdates.username && userUpdates.username !== origUserState.username) {
    changedValues.username = userUpdates.username;
  }
  if (userUpdates.password && userUpdates.password !== origUserState.password) {
    changedValues.password = userUpdates.password;
  }
  if (userUpdates.kind && userUpdates.kind !== origUserState.kind) {
    changedValues.kind = userUpdates.kind;
  }

  if (Object.getOwnPropertyNames(changedValues).length === 0) {
    displayModal(store, false);
  } else {
    let roleAssigned = Promise.resolve(savedUser);

    if (changedValues.kind) {
      // assumes there's no previous roles to delete at first
      let handlePreviousRoles = Promise.resolve();

      if (savedUser.roles.length) {
        // delete the old role models if this was not a learner
        handlePreviousRoles = Promise.all(
          savedUser.roles.map(({ id }) => RoleResource.getModel(id).delete())
        ).then(
          () => {
            // to avoid having to make an API call, clear manually
            savedUser.roles = [];
          },
          // models could not be deleted
          error => error
        );
      }

      // then assign the new role
      // Take care of previous roles if necessary (will autoresolve if not)
      roleAssigned = handlePreviousRoles.then(
        () => {
          // only need to assign a new role if not a learner
          if (changedValues.kind !== UserKinds.LEARNER) {
            assignUserRole(savedUser, changedValues.kind).then(
              updated => updated,
              error => handleApiError(store, error)
            );
          } else {
            // new role is learner - having deleted old roles is enough
            return savedUser;
          }
        },
        error => handleApiError(error)
      );
    }

    roleAssigned.then(() => {
      // payload needs username, fullname, and facility
      // update user object with new values
      savedUserModel.save(changedValues).then(
        userWithAttrs => {
          // dispatch changes to store
          store.dispatch('UPDATE_USERS', [_userState(userWithAttrs)]);
          displayModal(store, false);
          const currentUser = store.state.pageState.facilityUsers.find(
            user => user.id === store.state.core.session.user_id
          );
          if (currentUser.id === userId && changedValues.kind) {
            const newCurrentUserKind = store.state.core.session.kind.filter(
              kind => kind === UserKinds.SUPERUSER
            );
            newCurrentUserKind.push(changedValues.kind);
            store.dispatch('UPDATE_CURRENT_USER_KIND', newCurrentUserKind);
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
    });
  }
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

  FacilityUserResource.getCollection()
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
