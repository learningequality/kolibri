/* eslint-env node */
import * as getters from 'kolibri.coreVue.vuex.getters';
import {
  ClassroomResource,
  MembershipResource,
  FacilityUserResource,
  RoleResource,
} from 'kolibri.resources';

import {
  samePageCheckGenerator,
  kolibriLogout,
  handleApiError,
} from 'kolibri.coreVue.vuex.actions';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import { PageNames } from '../constants';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import {
  showFacilityConfigPage,
  resetFacilityConfig,
  saveFacilityConfig,
} from './facilityConfigPageActions';

import preparePage from './preparePage';

/**
 * Vuex State Mappers
 *
 * The methods below help map data from
 * the API to state in the Vuex store
 */
function _classState(data) {
  return {
    id: data.id,
    name: data.name,
    parent: data.parent,
    memberCount: data.learner_count,
    coachCount: data.coach_count,
    adminCount: data.admin_count,
  };
}

/*
 * This mostly duplicates _userState below, but searches Roles array for an exact match
 * on the classId, and not for any Role object.
 */
function _userStateForClassEditPage(facilityId, classId, apiUserData) {
  const matchingRole = apiUserData.roles.find(
    r =>
      String(r.collection) === String(classId) ||
      String(r.collection) === String(facilityId) ||
      r.kind === UserKinds.ADMIN ||
      r.kind === UserKinds.SUPERUSER
  );

  return {
    id: apiUserData.id,
    facility_id: apiUserData.facility,
    username: apiUserData.username,
    full_name: apiUserData.full_name,
    kind: matchingRole ? matchingRole.kind : UserKinds.LEARNER,
  };
}

// On 'Users' page, this will end up showing a Admin/Coach role if user has such
// Role for any class
function _userState(apiUserData) {
  function calcUserKind() {
    if (apiUserData.roles) {
      // array of strings, where each string represents a role object
      const roleKinds = apiUserData.roles.map(roleObj => roleObj.kind);
      if (roleKinds.includes(UserKinds.ADMIN)) {
        return UserKinds.ADMIN;
      } else if (roleKinds.includes(UserKinds.COACH)) {
        return UserKinds.COACH;
      }
    }
    return UserKinds.LEARNER;
  }

  return {
    id: apiUserData.id,
    facility_id: apiUserData.facility,
    username: apiUserData.username,
    full_name: apiUserData.full_name,
    kind: calcUserKind(apiUserData.roles),
    is_superuser: apiUserData.is_superuser,
  };
}

/**
 * Title Helper
 */

function _managePageTitle(title) {
  return `Manage ${title}`;
}

/**
 * Actions
 *
 * These methods are used to update client-side state
 */

function displayModal(store, modalName) {
  store.dispatch('SET_MODAL', modalName);
  store.dispatch('SET_ERROR', '');
  store.dispatch('SET_BUSY', false);
}

// ================================
// CLASSES MANAGEMENT ACTIONS

/**
 * Do a POST to create new class
 * @param {string} name
 */
function createClass(store, name) {
  const classData = {
    name,
    parent: store.state.core.session.facility_id,
  };

  ClassroomResource.createModel(classData)
    .save()
    .then(
      classModel => {
        // dispatch newly created class
        store.dispatch('ADD_CLASS', _classState(classModel));
        displayModal(store, false);
      },
      error => {
        handleApiError(store, error);
      }
    );
}

/**
 * Do a DELETE to delete the class.
 * @param {string or Integer} id
 */
function deleteClass(store, id) {
  if (!id) {
    // if no id passed, abort the function
    return;
  }
  ClassroomResource.getModel(id)
    .delete()
    .then(
      () => {
        store.dispatch('DELETE_CLASS', id);
        displayModal(store, false);
      },
      error => {
        handleApiError(store, error);
      }
    );
}

/**
 * Do a PATCH to update the class.
 * @param {string} id - class id.
 * @param {object} updateData.
 */
function updateClass(store, id, updateData) {
  if (!id || Object.keys(updateData).length === 0) {
    // if no id or empty updateData passed, abort the function
    return;
  }
  const classModel = ClassroomResource.getModel(id);

  classModel.save(updateData).then(
    response => {
      store.dispatch('UPDATE_CLASS', id, response);
      displayModal(store, false);
    },
    error => {
      handleApiError(store, error);
    }
  );
}

function removeClassUser(store, classId, userId) {
  if (!classId || !userId) {
    // if no id passed, abort the function
    return;
  }
  // fetch the membership model with this classId and userId.
  const MembershipCollection = MembershipResource.getCollection({
    user: userId,
    collection: classId,
  });

  MembershipCollection.delete().then(
    () => {
      store.dispatch('DELETE_CLASS_USER', userId);
      displayModal(store, false);
    },
    error => {
      handleApiError(store, error);
    }
  );
}

function showClassesPage(store) {
  preparePage(store.dispatch, {
    name: PageNames.CLASS_MGMT_PAGE,
    title: 'Classes',
  });
  const classCollection = ClassroomResource.getCollection();
  const classPromise = classCollection.fetch({}, true);
  const promises = [classPromise];
  ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    ([classes]) => {
      const pageState = {
        modalShown: false,
        classes: classes.map(_classState),
      };

      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      handleApiError(store, error);
    }
  );
}

function showClassEditPage(store, classId) {
  preparePage(store.dispatch, {
    name: PageNames.CLASS_EDIT_MGMT_PAGE,
    title: 'Edit Class',
  });

  const promises = [
    FacilityUserResource.getCollection({ member_of: classId }).fetch({}, true),
    ClassroomResource.getModel(classId).fetch(),
    ClassroomResource.getCollection().fetch({}, true),
  ];

  const facilityId = getters.currentFacilityId(store.state);

  const transformResults = ([facilityUsers, classroom, classrooms]) => ({
    modalShown: false,
    currentClass: classroom,
    classes: classrooms,
    classUsers: facilityUsers.map(_userStateForClassEditPage.bind(null, facilityId, classId)),
  });

  ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    results => {
      store.dispatch('SET_PAGE_STATE', transformResults(results));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      handleApiError(store, error);
    }
  );
}

function showClassEnrollPage(store, classId) {
  preparePage(store.dispatch, {
    name: PageNames.CLASS_ENROLL_MGMT_PAGE,
    title: 'Classes',
  });

  // all users in facility
  const userPromise = FacilityUserResource.getCollection().fetch({}, true);
  // current class
  const classPromise = ClassroomResource.getModel(classId).fetch();
  // users in current class
  const classUsersPromise = FacilityUserResource.getCollection({
    member_of: classId,
  }).fetch({}, true);

  ConditionalPromise.all([userPromise, classPromise, classUsersPromise]).only(
    samePageCheckGenerator(store),
    ([facilityUsers, classroom, classUsers]) => {
      const pageState = {
        facilityUsers: facilityUsers.map(_userState),
        classUsers: classUsers.map(_userState),
        class: classroom,
        modalShown: false,
        userJustCreated: null,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      handleApiError(store, error);
    }
  );
}

function enrollUsersInClass(store, classId, users) {
  // TODO no error handling
  const memberships = users.map(userId => ({
    collection: classId,
    user: userId,
  }));
  return MembershipResource.createCollection(
    {
      collection: classId,
    },
    memberships
  ).save();
}

// ================================
// USERS MANAGEMENT ACTIONS

/**
 * Does a POST request to assign a user role (only used in this file)
 * @param {Object} user
 * @param {string} user.id
 * @param {string} user.facility
 * @param {string} user.kind
 * Needed: id, facility, kind
 */
function assignUserRole(user, kind) {
  const rolePayload = {
    user: user.id,
    collection: user.facility,
    kind,
  };

  return new Promise((resolve, reject) => {
    RoleResource.createModel(rolePayload)
      .save()
      .then(
        roleModel => {
          // add role to user's attribute here to limit API call
          user.roles.push(roleModel);
          resolve(user);
        },
        error => reject(error)
      );
  });
}

/**
 * Do a POST to create new user
 * @param {object} stateUserData
 *  Needed: username, full_name, facility, role, password
 */
function createUser(store, stateUserData) {
  const userData = {
    facility: store.state.core.session.facility_id,
    username: stateUserData.username,
    full_name: stateUserData.full_name,
    password: stateUserData.password,
  };

  return new Promise((resolve, reject) => {
    FacilityUserResource.createModel(userData)
      .save()
      .then(
        userModel => {
          // only runs if there's a role to be assigned
          if (stateUserData.kind !== UserKinds.LEARNER) {
            assignUserRole(userModel, stateUserData.kind).then(
              userWithRole => resolve(userWithRole),
              error => reject(error)
            );
          } else {
            // no role to assigned
            resolve(userModel);
          }
        },
        error => reject(error)
      );
  }).then(
    // dispatch newly created user
    newUser => {
      const userState = _userState(newUser);
      store.dispatch('ADD_USER', userState);
      store.dispatch('SET_USER_JUST_CREATED', userState);
      displayModal(store, false);
    },
    // send back error if necessary
    error => Promise.reject(error)
  );
}

/**
 * Do a PATCH to update existing user
 * @param {object} store
 * @param {string} userId
 * @param {object} userUpdates Optional Changes: full_name, username, password, and kind(role)
 */
function updateUser(store, userId, userUpdates) {
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
        const roleDeletes = savedUser.roles.map(({ id }) => RoleResource.getModel(id).delete());

        // delete the old role models if this was not a learner
        handlePreviousRoles = Promise.all(roleDeletes).then(
          () => {
            // to avoid having to make an API call, clear manually
            savedUser.roles = [];
          },
          // models could not be deleted
          error => error
        );
      }

      // then assign the new role
      roleAssigned = new Promise((resolve, reject) => {
        // Take care of previous roles if necessary (will autoresolve if not)
        handlePreviousRoles.then(
          () => {
            // only need to assign a new role if not a learner
            if (changedValues.kind !== UserKinds.LEARNER) {
              assignUserRole(savedUser, changedValues.kind).then(
                updated => resolve(updated),
                error => handleApiError(store, error)
              );
            } else {
              // new role is learner - having deleted old roles is enough
              resolve(savedUserModel);
            }
          },
          error => reject(error)
        );
      });
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
function deleteUser(store, id) {
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
function showUserPage(store) {
  preparePage(store.dispatch, {
    name: PageNames.USER_MGMT_PAGE,
    title: _managePageTitle('Users'),
  });

  const userCollection = FacilityUserResource.getCollection();
  const userPromise = userCollection.fetch({}, true);

  const promises = [userPromise];

  ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    ([users]) => {
      const pageState = {
        facilityUsers: users.map(_userState),
        modalShown: false,
        error: '',
        isBusy: false,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      handleApiError(store, error);
    }
  );
}

// ================================
// OTHER ACTIONS

function showDataPage(store) {
  preparePage(store.dispatch, {
    name: PageNames.DATA_EXPORT_PAGE,
    title: _managePageTitle('Data'),
    isAsync: false,
  });
  store.dispatch('SET_PAGE_STATE', {});
}

export {
  displayModal,
  createClass,
  deleteClass,
  updateClass,
  removeClassUser,
  showClassesPage,
  showClassEditPage,
  showClassEnrollPage,
  showFacilityConfigPage,
  enrollUsersInClass,
  saveFacilityConfig,
  resetFacilityConfig,
  createUser,
  updateUser,
  deleteUser,
  showUserPage,
  showDataPage,
};
