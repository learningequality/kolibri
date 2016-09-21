const Kolibri = require('kolibri');
const logging = require('kolibri/lib/logging');

const FacilityUserResource = Kolibri.resources.FacilityUserResource;
const ChannelResource = Kolibri.resources.ChannelResource;
const TaskResource = Kolibri.resources.TaskResource;
const RoleResource = Kolibri.resources.RoleResource;

const constants = require('./state/constants');
const UserKinds = require('kolibri/coreVue/vuex/constants').UserKinds;
const PageNames = constants.PageNames;
const ContentWizardPages = constants.ContentWizardPages;


// ================================
// USER MANAGEMENT ACTIONS


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
    facility_id: data.facility,
    username: data.username,
    full_name: data.full_name,
    roles: data.roles,
    kind, // unused for now
  };
}

function _taskState(data) {
  const state = {
    id: data.id,
    type: data.type,
    status: data.status,
    metadata: data.metadata,
    percentage: data.percentage,
  };
  return state;
}


/**
 * Actions
 *
 * These methods are used to update client-side state
 */

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
  }).catch((error) => Promise.reject(error));
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
      OldRoleModel.delete().then(() => {
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
      OldRoleModel.delete().then(() => {
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
  const FacilityUserModel = FacilityUserResource.getModel(id);
  const deleteUserPromise = FacilityUserModel.delete();
  deleteUserPromise.then((user) => {
    store.dispatch('DELETE_USER', id);
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


// ================================
// CONTENT IMPORT/EXPORT ACTIONS


function showContentPage(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.CONTENT_MGMT_PAGE);
  const taskCollectionPromise = TaskResource.getCollection().fetch();
  taskCollectionPromise.then((taskList) => {
    const pageState = {
      taskList: taskList.map(_taskState),
      wizardState: { shown: false },
    };
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

function updateWizardLocalDriveList(store) {
  const localDrivesPromise = TaskResource.localDrives();
  store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', true);
  localDrivesPromise.then((response) => {
    store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
    store.dispatch('SET_CONTENT_PAGE_WIZARD_DRIVES', response.entity);
  })
  .catch((error) => {
    store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
    store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
  });
}

function startImportWizard(store) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_STATE', {
    shown: true,
    page: ContentWizardPages.CHOOSE_IMPORT_SOURCE,
    error: null,
    busy: false,
    drivesLoading: false,
    driveList: null,
  });
}

function startExportWizard(store) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_STATE', {
    shown: true,
    page: ContentWizardPages.EXPORT,
    error: null,
    busy: false,
    drivesLoading: false,
    driveList: null,
  });
  updateWizardLocalDriveList(store);
}

function showImportNetworkWizard(store) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_STATE', {
    shown: true,
    page: ContentWizardPages.IMPORT_NETWORK,
    error: null,
    busy: false,
    drivesLoading: false,
    driveList: null,
  });
}

function showImportLocalWizard(store) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_STATE', {
    shown: true,
    page: ContentWizardPages.IMPORT_LOCAL,
    error: null,
    busy: false,
    drivesLoading: false,
    driveList: null,
  });
  updateWizardLocalDriveList(store);
}

function cancelImportExportWizard(store) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_STATE', {
    shown: false,
    error: null,
    busy: false,
    drivesLoading: false,
    driveList: null,
  });
}

// called from a timer to continually update UI
function pollTasksAndChannels(store) {
  TaskResource.getCollection().fetch({}, true).then(
    (taskList) => {
      ChannelResource.getCollection({}).fetch({}, true).then((channelList) => {
        store.dispatch('SET_CONTENT_PAGE_TASKS', taskList.map(_taskState));
        store.dispatch('SET_CONTENT_PAGE_CHANNELS', channelList);

        // Close the wizard if there's an outstanding task.
        // (this can be removed when we support more than one
        // concurrent task.)
        if (taskList.length && store.state.pageState.wizardState.shown) {
          cancelImportExportWizard(store);
        }
      });
    },
    (error) => {
      logging.error(`poll error: ${error}`);
    }
  );
}

function clearTask(store, taskId) {
  const clearTaskPromise = TaskResource.clearTask(taskId);
  clearTaskPromise.then(() => {
    store.dispatch('SET_CONTENT_PAGE_TASKS', []);
  })
  .catch((error) => {
    store.dispatch('CORE_SET_ERROR', JSON.stringify(error, null, '\t'));
  });
}

function triggerLocalContentImportTask(store, driveId) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', true);
  const localImportPromise = TaskResource.localImportContent(driveId);
  localImportPromise.then((response) => {
    store.dispatch('SET_CONTENT_PAGE_TASKS', [_taskState(response.entity)]);
    cancelImportExportWizard(store);
  })
  .catch((error) => {
    store.dispatch('SET_CONTENT_PAGE_WIZARD_ERROR', error.entity[0]); // TODO
    store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
  });
}

function triggerLocalContentExportTask(store, driveId) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', true);
  const localExportPromise = TaskResource.localExportContent(driveId);
  localExportPromise.then((response) => {
    store.dispatch('SET_CONTENT_PAGE_TASKS', [_taskState(response.entity)]);
    cancelImportExportWizard(store);
  })
  .catch((error) => {
    store.dispatch('SET_CONTENT_PAGE_WIZARD_ERROR', error.entity[0]); // TODO
    store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
  });
}

function triggerRemoteContentImportTask(store, channelId) {
  store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', true);
  const remoteImportPromise = TaskResource.remoteImportContent(channelId);
  remoteImportPromise.then((response) => {
    store.dispatch('SET_CONTENT_PAGE_TASKS', [_taskState(response.entity)]);
    cancelImportExportWizard(store);
  })
  .catch((error) => {
    store.dispatch('SET_CONTENT_PAGE_WIZARD_ERROR', error.entity[0]); // TODO
    store.dispatch('SET_CONTENT_PAGE_WIZARD_BUSY', false);
  });
}


// ================================
// OTHER ACTIONS


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
  pollTasksAndChannels,
  clearTask,
  startImportWizard,
  startExportWizard,
  showImportNetworkWizard,
  showImportLocalWizard,
  cancelImportExportWizard,
  triggerLocalContentExportTask,
  triggerLocalContentImportTask,
  triggerRemoteContentImportTask,
  updateWizardLocalDriveList,

  showDataPage,
  showScratchpad,
};
