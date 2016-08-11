const Kolibri = require('kolibri');

const FacilityUserResource = Kolibri.resources.FacilityUserResource;
const ChannelResource = Kolibri.resources.ChannelResource;
const TaskResource = Kolibri.resources.TaskResource;
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


/**
 * Do a POST to create new user
 * @param {object} payload
 * @param {string} role
 */
function createUser(store, payload, role) {
  const FacilityUserModel = FacilityUserResource.createModel(payload);
  const newUserPromise = FacilityUserModel.save(payload);
  // returns a promise so the result can be used by the caller
  return newUserPromise.then((model) => {
    // assign role to this new user if the role is not learner
    if (role === 'learner' || !role) {
      store.dispatch('ADD_USER', _userState(model));
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
          store.dispatch('ADD_USER', _userState(updatedModel));
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
  const userCollection = FacilityUserResource.getCollection();
  const facilityIdPromise = FacilityUserResource.getCurrentFacility();
  const userPromise = userCollection.fetch();

  const promises = [facilityIdPromise, userPromise];

  Promise.all(promises).then(([facilityId, users]) => {
    store.dispatch('SET_FACILITY', facilityId[0]); // for mvp, we assume only one facility exists

    const pageState = {
      users: users.map(_userState),
    };

    store.dispatch('SET_PAGE_STATE', pageState);
    store.dispatch('CORE_SET_PAGE_LOADING', false);
    store.dispatch('CORE_SET_ERROR', null);
  },
  rejects => {
    store.dispatch('CORE_SET_ERROR', JSON.stringify(rejects, null, '\t'));
    store.dispatch('CORE_SET_PAGE_LOADING', false);
  });
}

function showContentPage(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.CONTENT_MGMT_PAGE);
  // const taskCollectionPromise = TaskResource.getCollection().fetch();
  const taskCollectionPromise = Promise.resolve([]); // TODO - remove
  taskCollectionPromise.then((taskList) => {
    const pageState = { showWizard: false };
    pageState.taskList = taskList;
    const channelCollectionPromise = ChannelResource.getCollection({}).fetch();
    channelCollectionPromise.then((channelList) => {
      pageState.channelList = channelList;
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
  })
  .catch((error) => {
    store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
    store.dispatch('CORE_SET_PAGE_LOADING', false);
  });
}

// background worker calls this to continually update UI
function updateTasks(store) {
  const taskCollectionPromise = TaskResource.getCollection().fetch();
  taskCollectionPromise.then((taskList) => {
    const pageState = { showWizard: false };
    pageState.taskList = taskList;
    const channelCollectionPromise = ChannelResource.getCollection({}).fetch();
    channelCollectionPromise.then((channelList) => {
      pageState.channelList = channelList;
      store.dispatch('SET_PAGE_STATE', pageState);
    });
  })
  .catch((error) => {
    store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
  });
}

function clearTasks(store, id) {
  const currentTaskPromise = TaskResource.getModel(id).delete(id);
  currentTaskPromise.then(() => {
    // only 1 task should be running, but we set to empty array
    store.dispatch('SET_TASKS', []);
  })
  .catch((error) => {
    store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
  });
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
  updateTasks,
  clearTasks,
};
