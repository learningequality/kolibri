const Kolibri = require('kolibri');

const DeviceOwnerResource = Kolibri.resources.DeviceOwnerResource;

function createDeviceOwner(store, payload) {
  const deviceOwnerPromise = DeviceOwnerResource.createDeviceOwner(payload);
  deviceOwnerPromise.then(responses => {
    console.log('yoyo: ', responses);
    window.location = responses;
  },
  rejects => {
    store.dispatch('SET_ERROR', JSON.stringify(rejects, null, '\t'));
  });
}


module.exports = {
  createDeviceOwner,
};
