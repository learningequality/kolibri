const Kolibri = require('kolibri');

const DeviceOwnerResource = Kolibri.resources.DeviceOwnerResource;
const FacilityResource = Kolibri.resources.FacilityResource;

function createDeviceOwnerAndFacility(store, deviceownerpayload, facilitypayload) {
  const DeviceOwnerModel = DeviceOwnerResource.createModel(deviceownerpayload);
  const deviceOwnerPromise = DeviceOwnerModel.save(deviceownerpayload);
  const FacilityModel = FacilityResource.createModel(facilitypayload);
  const facilityPromise = FacilityModel.save(facilitypayload);
  const promises = [deviceOwnerPromise, facilityPromise];
  Promise.all(promises).then(responses => {
    // redirect to learn page after successfully created the DeviceOwner and Facility.
    window.location = Kolibri.urls['kolibri:learnplugin:learn']();
  },
  rejects => {
    store.dispatch('SET_ERROR', JSON.stringify(rejects, null, '\t'));
  });
}


module.exports = {
  createDeviceOwnerAndFacility,
};
