const Kolibri = require('kolibri');

const FacilityUserResource = Kolibri.resources.FacilityUserResource;
const RoleResource = Kolibri.resources.RoleResource;

const constants = require('./state/constants');
const PageNames = constants.PageNames;


/**
 * Do a POST to create new user
 * @param {object} payload
 * @param {string} role
 */
function createUser(store, payload, role) {
  const FacilityUserModel = FacilityUserResource.createModel(payload);
  const newUserPromise = FacilityUserModel.save(payload);
  newUserPromise.then((model) => {
    // assgin role to this new user if the role is not learner
    if (role === 'learner' || !role) {
      // mutation ADD_USERS only take array
      store.dispatch('ADD_USERS', [model]);
    } else {
      const rolePayload = {
        user: model.id,
        collection: model.facility,
        kind: role,
      };
      const RoleModel = RoleResource.createModel(rolePayload);
      const newRolePromise = RoleModel.save(rolePayload);
      newRolePromise.then((results) => {
        FacilityUserModel.fetch({}, true).then(updatedModel => {
          store.dispatch('ADD_USERS', [updatedModel]);
        });
      }).catch((error) => {
        store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      });
    }
  })
  .catch((error) => {
    store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
  });
}

/**
 * Do a PATCH to update existing user
 * @param {string} id
 * @param {object} payload
 * @param {string} role
 */
function updateUser(store, id, payload, role) {
  const FacilityUserModel = FacilityUserResource.getModel(id);
  const oldRoldID = FacilityUserModel.attributes.roles.length ?
    FacilityUserModel.attributes.roles[0].id : null;
  const oldRole = FacilityUserModel.attributes.roles.length ?
    FacilityUserModel.attributes.roles[0].kind : 'learner';

  if (oldRole !== role) {
  // the role changed
    if (oldRole === 'learner') {
    // role is admin or coach.
      const rolePayload = {
        user: id,
        collection: FacilityUserModel.attributes.facility,
        kind: role,
      };
      const RoleModel = RoleResource.createModel(rolePayload);
      RoleModel.save(rolePayload).then((newRole) => {
        FacilityUserModel.save(payload).then(responses => {
          // force role change because if the role is the only changing attribute
          // FacilityUserModel.save() will not send request to server.
          responses.roles = [newRole];
          store.dispatch('UPDATE_USERS', [responses]);
        })
        .catch((error) => {
          store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
        });
      });
    } else if (role !== 'learner') {
    // oldRole is admin and role is coach or oldRole is coach and role is admin.
      const OldRoleModel = RoleResource.getModel(oldRoldID);
      OldRoleModel.delete(oldRoldID).then(() => {
      // create new role when old role is successfully deleted.
        const rolePayload = {
          user: id,
          collection: FacilityUserModel.attributes.facility,
          kind: role,
        };
        const RoleModel = RoleResource.createModel(rolePayload);
        RoleModel.save(rolePayload).then((newRole) => {
        // update the facilityUser when new role is successfully created.
          FacilityUserModel.save(payload).then(responses => {
            // force role change because if the role is the only changing attribute
            // FacilityUserModel.save() will not send request to server.
            responses.roles = [newRole];
            store.dispatch('UPDATE_USERS', [responses]);
          })
          .catch((error) => {
            store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
          });
        });
      })
      .catch((error) => {
        store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      });
    } else {
    // role is learner and oldRole is admin or coach.
      const OldRoleModel = RoleResource.getModel(oldRoldID);
      OldRoleModel.delete(oldRoldID).then(() => {
        FacilityUserModel.save(payload).then(responses => {
          // force role change because if the role is the only changing attribute
          // FacilityUserModel.save() will not send request to server.
          responses.roles = [];
          store.dispatch('UPDATE_USERS', [responses]);
        })
        .catch((error) => {
          store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
        });
      });
    }
  } else {
  // the role is not changed
    FacilityUserModel.save(payload).then(responses => {
      store.dispatch('UPDATE_USERS', [responses]);
    })
    .catch((error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
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
  const FacilityUserModel = Kolibri.resources.FacilityUserResource.getModel(id);
  const newUserPromise = FacilityUserModel.delete(id);
  newUserPromise.then((userId) => {
    store.dispatch('DELETE_USERS', [userId]);
  })
  .catch((error) => {
    store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
  });
}

// An action for setting up the initial state of the app by fetching data from the server
function showUserPage(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.USER_MGMT_PAGE);
  const learnerCollection = FacilityUserResource.getCollection();
  const roleCollection = RoleResource.getCollection();
  const facilityIdPromise = FacilityUserResource.getCurrentFacility();
  const userPromise = learnerCollection.fetch();
  const rolePromise = roleCollection.fetch();
  const promises = [facilityIdPromise, userPromise, rolePromise];
  Promise.all(promises).then(([id, users]) => {
    store.dispatch('SET_FACILITY', id[0]); // for mvp, we assume only one facility exists
    store.dispatch('ADD_USERS', users);
    store.dispatch('CORE_SET_PAGE_LOADING', false);
    store.dispatch('CORE_SET_ERROR', null);
  },
  rejects => {
    store.dispatch('CORE_SET_ERROR', JSON.stringify(rejects, null, '\t'));
    store.dispatch('CORE_SET_PAGE_LOADING', false);
  });
}

/**
 * Do a POST to login the user.
 * @param {object} payload
 */
function login(store, payload) {
  const facilityIdPromise = FacilityUserResource.login(payload);
  facilityIdPromise.then(response => {
    store.dispatch('SET_LOGGED_IN_USERNAME', payload.username);
    store.dispatch('SET_LOGGED_IN_STATE', true);
  },
  reject => {
    store.dispatch('SET_ERROR', JSON.stringify(reject, null, '\t'));
  });
}

/**
 * Do a POST to logout the user.
 */
function logout(store) {
  const facilityIdPromise = FacilityUserResource.logout();
  facilityIdPromise.then(response => {
    console.log('logout in actions.js called');
  },
  reject => {
    store.dispatch('SET_ERROR', JSON.stringify(reject, null, '\t'));
  });
}

function showContentPage(store) {
  store.dispatch('SET_PAGE_NAME', PageNames.CONTENT_MGMT_PAGE);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
}

function showDataPage(store) {
  store.dispatch('SET_PAGE_NAME', PageNames.DATA_EXPORT_PAGE);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
}

function showScratchpad(store) {
  store.dispatch('SET_PAGE_NAME', PageNames.SCRATCHPAD);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
}

module.exports = {
  createUser,
  updateUser,
  deleteUser,
  // fetchInitialData,
  login,
  logout,
  showUserPage,
  showContentPage,
  showDataPage,
  showScratchpad,
};
