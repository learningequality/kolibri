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
    // always add role atrribute to facilityUser
    model.attributes.role = role;
    // assgin role to this new user if the role is not learner
    if (role === 'learner' || !role) {
      // mutation ADD_LEARNERS only take array
      store.dispatch('ADD_LEARNERS', [model]);
    } else {
      const rolePayload = {
        user: model.attributes.id,
        collection: model.attributes.facility,
        kind: role,
      };
      const RoleModel = RoleResource.createModel(rolePayload);
      const newRolePromise = RoleModel.save(rolePayload);
      newRolePromise.then((results) => {
        model.attributes.roleID = results.attributes.id;
        // mutation ADD_LEARNERS only take array
        store.dispatch('ADD_LEARNERS', [model]);
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
  const oldRoldID = FacilityUserModel.attributes.roleID;
  const oldRole = FacilityUserModel.attributes.role;
  if (oldRole !== role) {
    if (role === 'learner' || !role) {
      const OldRoleModel = RoleResource.getModel(oldRoldID);
      const OldRolePromise = OldRoleModel.delete(oldRoldID);
      OldRolePromise.then((oldRoleID) => { })
      .catch((error) => {
        store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
      });
    } else {
      const rolePayload = {
        user: id,
        collection: FacilityUserModel.attributes.facility,
        kind: role,
      };
      const RoleModel = RoleResource.createModel(rolePayload);
      const newRolePromise = RoleModel.save(rolePayload);
      newRolePromise.then((results) => { })
      .catch((error) => {
        store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
      });
    }
  }
  const newUserPromise = FacilityUserModel.save(payload);
  newUserPromise.then((model) => {
    store.dispatch('UPDATE_LEARNERS', [model]);
  })
  .catch((error) => {
    store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
  });
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
function fetch({ dispatch }) {
  const learnerCollection = FacilityUserResource.getCollection();
  const facilityIdPromise = learnerCollection.getCurrentFacility();
  const learnerPromise = learnerCollection.fetch();
  learnerPromise.then(() => {
    dispatch('ADD_LEARNERS', learnerCollection.models);
  });
  facilityIdPromise.then((id) => {
    if (id.constructor === Array) {
      // for mvp, we assume only one facility ever existed.
      dispatch('SET_FACILITY', id[0]);
    } else {
      dispatch('SET_FACILITY', id);
    }
  });
}

module.exports = {
  createUser,
  updateUser,
  deleteUser,
  fetch,
};
