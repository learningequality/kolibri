const coreApp = require('kolibri');
const getters = require('kolibri.coreVue.vuex.getters');

const ClassroomResource = coreApp.resources.ClassroomResource;
const MembershipResource = coreApp.resources.MembershipResource;
const FacilityUserResource = coreApp.resources.FacilityUserResource;
const RoleResource = coreApp.resources.RoleResource;

const coreActions = require('kolibri.coreVue.vuex.actions');
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const constants = require('../constants');
const UserKinds = require('kolibri.coreVue.vuex.constants').UserKinds;

const PageNames = constants.PageNames;
const samePageCheckGenerator = require('kolibri.coreVue.vuex.actions').samePageCheckGenerator;
// because these modules use ES6 module syntax, need to access exports.default in CommonJS context
const addCoachRoleAction = require('./addCoachRoleAction').default;
const removeCoachRoleAction = require('./removeCoachRoleAction').default;
const {
  showFacilityConfigPage,
  resetFacilityConfig,
  saveFacilityConfig,
} = require('./facilityConfigPageActions');
const manageContentActions = require('./manageContentActions');

const preparePage = require('./preparePage');

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
  const matchingRole = apiUserData.roles.find((r) => (
      String(r.collection) === String(classId) ||
      String(r.collection) === String(facilityId) ||
      r.kind === UserKinds.ADMIN ||
      r.kind === UserKinds.SUPERUSER
    )
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
      const roleKinds = apiUserData.roles.map((roleObj) => roleObj.kind);
      if (roleKinds.includes(UserKinds.ADMIN || UserKinds.SUPERUSER)) {
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

  ClassroomResource.createModel(classData).save().then(
    classModel => {
      // dispatch newly created class
      store.dispatch('ADD_CLASS', _classState(classModel));
      displayModal(store, false);
    },
    error => { coreActions.handleApiError(store, error); }
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
  ClassroomResource.getModel(id).delete().then(
    classModel => {
      store.dispatch('DELETE_CLASS', id);
      displayModal(store, false);
    },
    error => { coreActions.handleApiError(store, error); }
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
    error => { coreActions.handleApiError(store, error); }
  );
}

function removeClassUser(store, classId, userId) {
  if (!classId || !userId) {
    // if no id passed, abort the function
    return;
  }
  // fetch the membership model with this classId and userId.
  const MembershipCollection = MembershipResource.getCollection({
    user_id: userId,
    collection_id: classId,
  });

  MembershipCollection.fetch().then(
    (membership) => {
      const membershipId = membership[0].id; // will always only have one item in the array.
      MembershipResource.getModel(membershipId).delete().then(
        response => {
          store.dispatch('DELETE_CLASS_USER', userId);
          displayModal(store, false);
        },
        error => { coreActions.handleApiError(store, error); }
      );
    }
  );
}

function showClassesPage(store) {
  preparePage(store.dispatch, { name: PageNames.CLASS_MGMT_PAGE, title: 'Classes' });
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
    error => { coreActions.handleApiError(store, error); }
  );
}

function showClassEditPage(store, classId) {
  preparePage(store.dispatch, { name: PageNames.CLASS_EDIT_MGMT_PAGE, title: 'Edit Class' });

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
    (results) => {
      store.dispatch('SET_PAGE_STATE', transformResults(results));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => { coreActions.handleApiError(store, error); }
  );
}


function showClassEnrollPage(store, classId) {
  preparePage(store.dispatch, { name: PageNames.CLASS_ENROLL_MGMT_PAGE, title: 'Classes' });

  // all users in facility
  const userPromise = FacilityUserResource.getCollection().fetch({}, true);
  // current class
  const classPromise = ClassroomResource.getModel(classId).fetch();
  // users in current class
  const classUsersPromise =
    FacilityUserResource.getCollection({ member_of: classId }).fetch({}, true);

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
      coreActions.handleApiError(store, error);
    }
  );
}


function enrollUsersInClass(store, classId, users) {
  // TODO no error handling
  return Promise.all(
    users.map((userId) =>
      MembershipResource.createModel({ collection: classId, user: userId }).save())
  );
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
    RoleResource.createModel(rolePayload).save().then(
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
    FacilityUserResource.createModel(userData).save().then(
      (userModel) => {
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
      (error) => reject(error)
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
 * @param {object} stateUser
 * Needed: id
 * Optional Changes: full_name, username, password, facility, kind(role)
 */
function updateUser(store, stateUser) {
  // payload needs username, fullname, and facility
  const savedUserModel = FacilityUserResource.getModel(stateUser.id);
  const savedUser = savedUserModel.attributes;
  const changedValues = {};
  let roleAssigned = Promise.resolve(savedUser);

  // explicit checks for the only values that can be changed
  if (stateUser.full_name && stateUser.full_name !== savedUser.full_name) {
    changedValues.full_name = stateUser.full_name;
  }
  if (stateUser.username && stateUser.username !== savedUser.username) {
    changedValues.username = stateUser.username;
  }
  if (stateUser.password && stateUser.password !== savedUser.password) {
    changedValues.password = stateUser.password;
  }

  if (stateUser.kind && stateUser.kind !== _userState(savedUser).kind) {
    // assumes there's no previous roles to delete at first
    let handlePreviousRoles = Promise.resolve();

    if (savedUser.roles.length) {
      const roleDeletes = [];
      savedUser.roles.forEach(role => {
        roleDeletes.push(RoleResource.getModel(role.id).delete());
      });

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
          if (stateUser.kind !== UserKinds.LEARNER) {
            assignUserRole(savedUser, stateUser.kind).then(
              updated => resolve(updated),
              error => coreActions.handleApiError(store, error)
            );
          } else {
            // new role is learner - having deleted old roles is enough
            resolve(savedUser);
          }
        },
        error => reject(error));
    });
  }

  roleAssigned.then(userWithRole => {
    // update user object with new values
    savedUserModel.save(changedValues).then(userWithAttrs => {
      // dispatch changes to store
      store.dispatch('UPDATE_USERS', [_userState(userWithAttrs)]);
    });
  });
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
  FacilityUserResource.getModel(id).delete().then(
    user => { store.dispatch('DELETE_USER', id); },
    error => { coreActions.handleApiError(store, error); }
  );
}


// An action for setting up the initial state of the app by fetching data from the server
function showUserPage(store) {
  preparePage(store.dispatch, { name: PageNames.USER_MGMT_PAGE, title: _managePageTitle('Users') });

  const userCollection = FacilityUserResource.getCollection();
  const userPromise = userCollection.fetch({}, true);

  const promises = [userPromise];

  ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    ([users]) => {
      const pageState = {
        facilityUsers: users.map(_userState),
        modalShown: false,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => { coreActions.handleApiError(store, error); }
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

function showScratchpad(store) {
  preparePage(store.dispatch, {
    name: PageNames.DATA_EXPORT_PAGE,
    title: _managePageTitle('Scratchpad'),
    isAsync: false,
  });
  store.dispatch('SET_PAGE_STATE', {});
}


const actions = {
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
  addCoachRole: addCoachRoleAction,
  removeCoachRole: removeCoachRoleAction,

  showDataPage,
  showScratchpad,
};

module.exports = Object.assign(actions, manageContentActions);
