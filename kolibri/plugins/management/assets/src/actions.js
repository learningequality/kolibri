const Kolibri = require('kolibri');

const FacilityUserResource = Kolibri.resources.FacilityUserResource;
const RoleResource = Kolibri.resources.RoleResource;

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
      // mutation ADD_LEARNERS only take array
      store.dispatch('ADD_LEARNERS', [model]);
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
          store.dispatch('ADD_LEARNERS', [updatedModel]);
        });
      }).catch((error) => {
        store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
      });
    }
  })
  .catch((error) => {
    store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
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
  if (!FacilityUserModel) {
    store.dispatch('SET_ERROR', 'Cannot find any user by this id.');
    return;
  }
  const oldRoldID = FacilityUserModel.attributes.roles.length ?
    FacilityUserModel.attributes.roles[0].id : null;
  const oldRole = FacilityUserModel.attributes.roles.length ?
    FacilityUserModel.attributes.roles[0].kind : 'learner';
  if (oldRole === 'learner') {
    if (oldRole !== role) {
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
          store.dispatch('UPDATE_LEARNERS', [responses]);
        })
        .catch((error) => {
          store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
        });
      });
    } else {
      FacilityUserModel.save(payload).then(responses => {
        store.dispatch('UPDATE_LEARNERS', [responses]);
      })
      .catch((error) => {
        store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
      });
    }
  } else {
    if (oldRole !== role) {
      const OldRoleModel = RoleResource.getModel(oldRoldID);
      OldRoleModel.delete(oldRoldID).then(() => {
        FacilityUserModel.save(payload).then(responses => {
          // force role change because if the role is the only changing attribute
          // FacilityUserModel.save() will not send request to server.
          responses.roles = [];
          store.dispatch('UPDATE_LEARNERS', [responses]);
        })
        .catch((error) => {
          store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
        });
      });
    }
    if (role !== 'learner') {
      const rolePayload = {
        user: id,
        collection: FacilityUserModel.attributes.facility,
        kind: role,
      };
      const RoleModel = RoleResource.createModel(rolePayload);
      RoleModel.save(rolePayload).then((newRole) => {
        FacilityUserModel.save(payload).then(responses => {
          responses.roles = [newRole];
          store.dispatch('UPDATE_LEARNERS', [responses]);
        })
        .catch((error) => {
          store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
        });
      });
    }
  }
}

/**
 * Pass a null id will do a POST to create new user,
 * @param {string} id
 */
function deleteUser(store, id) {
  if (!id) {
    // if no id passed, abort the function
    return;
  }
  const FacilityUserModel = Kolibri.resources.FacilityUserResource.getModel(id);
  const newUserPromise = FacilityUserModel.delete(id);
  newUserPromise.then((userId) => {
    store.dispatch('DELETE_LEARNERS', [userId]);
  })
  .catch((error) => {
    store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
  });
}

// An action for setting up the initial state of the app by fetching data from the server
function fetch(store) {
  const learnerCollection = FacilityUserResource.getCollection();
  const roleCollection = RoleResource.getCollection();
  const facilityIdPromise = learnerCollection.getCurrentFacility();
  const learnerPromise = learnerCollection.fetch();
  const rolePromise = roleCollection.fetch();
  const promises = [facilityIdPromise, learnerPromise, rolePromise];
  Promise.all(promises).then(responses => {
    const id = responses[0];
    if (id.constructor === Array) {
      // for mvp, we assume only one facility ever existed.
      store.dispatch('SET_FACILITY', id[0]);
    } else {
      store.dispatch('SET_FACILITY', id);
    }
    const learners = responses[1];
    store.dispatch('ADD_LEARNERS', learners);
  },
  rejects => {
    store.dispatch('SET_ERROR', JSON.stringify(rejects, null, '\t'));
  });
}

module.exports = {
  createUser,
  updateUser,
  deleteUser,
  fetch,
};
