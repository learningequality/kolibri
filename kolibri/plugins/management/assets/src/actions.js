const Kolibri = require('kolibri');

const FacilityUserResource = Kolibri.resources.FacilityUserResource;
const RoleResource = Kolibri.resources.RoleResource;

function createUser(store, payload, role) {
  const FacilityUserModel = FacilityUserResource.addModelData(payload);
  const newUserPromise = FacilityUserModel.save(payload);
  newUserPromise.then((model) => {
    // always add role atrribute to facilityUser
    model.attributes.role = role;
    // assgin role to this new user if the role is not learner
    if (role === 'learner') {
      // mutation ADD_LEARNERS only take array
      store.dispatch('ADD_LEARNERS', [model]);
    } else {
      const rolePayload = {
        user: model.attributes.id,
        collection: model.attributes.facility,
        kind: role,
      };
      const RoleModel = RoleResource.addModelData(rolePayload);
      const newRolePromise = RoleModel.save(rolePayload);
      newRolePromise.then((results) => {
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

function deleteUser(store, id) {
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
