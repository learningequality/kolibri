const Kolibri = require('kolibri');

const FacilityUserResource = Kolibri.resources.FacilityUserResource;
const RoleResource = Kolibri.resources.RoleResource;

const constants = require('./state/constants');
const UserKinds = require('core-constants').UserKinds;
const PageNames = constants.PageNames;


/**
 * Vuex State Mappers
 *
 * The methods below help map data from
 * the API to state in the Vuex store
 */

// modifies data to be suitable in vue
function _userState(data) {
  // assume just one role for now
  let kind = UserKinds.LEARNER;
  if (data.roles.length && data.roles[0].kind === 'admin') {
    kind = UserKinds.ADMIN;
  }
  return {
    id: data.id,
    username: data.username,
    full_name: data.full_name,
    roles: data.roles,
    kind, // unused for now
  };
}

// returns true if there was a role to asssign, false if not (learner)
// returns null and errors out if promise is unsuccessful.
function assignUserRole(store, user, role) {
  let userModel = user;

  if (role !== 'learner') {
    // prepare data for resource payload
    const roleData = {
      user: user.id,
      collection: user.facility,
      // assuming just 1 role for now
      kind: role,
    };

    // create model in resource, then fetch to ensure that it was created
    // duplicate data seems redundant?
    const rolePromise = RoleResource.addModel(roleData).save(roleData);

    // set role assigned to true if promise is successful, send error if not
    rolePromise.then(newModel => {
      userModel = newModel;
    }, (error) => {
      store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
    });
  }

  return userModel;
}

/**
 * Do a POST to create new user
 * @param {object} payload
 * @param {string} role
 */

// might want to consider optimistic dispatch

function createUser(store, user) {
  // parsing out role here rather than in the view
  const payload = Object.assign({}, user);
  delete payload.role;

  // create a model with the proper payload, save to resource
  const userPromise = FacilityUserResource.addModel(payload).save(payload);

  // assigns user to role in facility (accounts for learner), errors otherwise
  userPromise.then(model => {
    // dispatches user model, modified if role is assigned.
    store.dispatch('ADD_USER', _userState(assignUserRole(store, model, user.role)));
  }, (error) => {
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
  if (id) {
    // gets the model, deletes from resource layer
    Kolibri.resources.FacilityUserResource.getModel(id).delete(id).then(
      userId => {
        // updates the view store
        store.dispatch('DELETE_USER', userId);
      },
      error => {
        store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
      });
  }
}

// An action for setting up the initial state of the app by fetching data from the server
function showUserPage(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.USER_MGMT_PAGE);
  const userCollection = FacilityUserResource.getCollection();
  const facilityIdPromise = FacilityUserResource.getCurrentFacility();
  const userPromise = userCollection.fetch();

  const promises = [facilityIdPromise, userPromise];

  Promise.all(promises).then(([facilityId, users]) => {
    store.dispatch('SET_FACILITY', facilityId[0]); // for mvp, we assume only one facility exists

    store.dispatch('SET_PAGE_STATE', users.map(_userState));
    store.dispatch('CORE_SET_PAGE_LOADING', false);
    store.dispatch('CORE_SET_ERROR', null);
  },
  rejects => {
    store.dispatch('CORE_SET_ERROR', JSON.stringify(rejects, null, '\t'));
    store.dispatch('CORE_SET_PAGE_LOADING', false);
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
  showUserPage,
  showContentPage,
  showDataPage,
  showScratchpad,
};
