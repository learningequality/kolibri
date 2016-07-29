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
      model.attributes.roleID = null;
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
        model.attributes.roleID = results.id;
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
  const oldRole = FacilityUserModel.attributes.role;
  const newUserPromise = FacilityUserModel.save(payload);
  newUserPromise.then((model) => {
    if (oldRole === role) {
      // mutation UPDATE_LEARNERS only take array
      store.dispatch('UPDATE_LEARNERS', [model]);
    } else {
      // update add role atrribute to facilityUser
      model.attributes.role = role;
      // create new role
      if (role === 'learner' || !role) {
        // delete old role
        const OldRoleModel = RoleResource.getModel(model.attributes.roleID);
        const OldRolePromise = OldRoleModel.delete(model.attributes.roleID);
        OldRolePromise.then((oldRoleID) => {
          // assign new role id
          model.attributes.roleID = null;
          store.dispatch('UPDATE_LEARNERS', [model]);
        });
      } else {
        const rolePayload = {
          user: model.attributes.id,
          collection: model.attributes.facility,
          kind: role,
        };
        const RoleModel = RoleResource.createModel(rolePayload);
        const newRolePromise = RoleModel.save(rolePayload);
        newRolePromise.then((results) => {
          if (oldRole === 'learner') {
            // assign new role id
            model.attributes.roleID = results.id;
            store.dispatch('UPDATE_LEARNERS', [model]);
          } else {
            // delete old role
            const OldRoleModel = RoleResource.getModel(model.attributes.roleID);
            const OldRolePromise = OldRoleModel.delete(model.attributes.roleID);
            OldRolePromise.then((oldRoleID) => {
              // assign new role id
              model.attributes.roleID = results.id;
              store.dispatch('UPDATE_LEARNERS', [model]);
            })
            .catch((error) => {
              store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
            });
          }
        }).catch((error) => {
          store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
        });
      }
    }
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
  const learnerPromise = learnerCollection.fetch();
  const promises = [learnerPromise];
  Promise.all(promises).then(() => {
    dispatch('ADD_LEARNERS', learnerCollection.models);
  });
}

module.exports = {
  createUser,
  updateUser,
  deleteUser,
  fetch,
};
