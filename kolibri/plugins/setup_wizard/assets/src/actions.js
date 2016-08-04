const Kolibri = require('kolibri');

const DeviceOwnerResource = Kolibri.resources.DeviceOwnerResource;

function createDeviceOwner(store, payload) {
  const deviceOwnerPromise = DeviceOwnerResource.createSuperUser(payload);
  deviceOwnerPromise.then(responses => {
    window.location = responses;
  },
  rejects => {
    store.dispatch('SET_ERROR', JSON.stringify(rejects, null, '\t'));
  });
}


module.exports = {
  createDeviceOwner,
};
