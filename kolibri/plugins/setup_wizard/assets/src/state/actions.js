import { DeviceOwnerResource, FacilityResource } from 'kolibri.resources';
import { kolibriLogin, handleApiError } from 'kolibri.coreVue.vuex.actions';

function createDeviceOwnerAndFacility(store, deviceownerpayload, facilitypayload) {
  const DeviceOwnerModel = DeviceOwnerResource.createModel(deviceownerpayload);
  const deviceOwnerPromise = DeviceOwnerModel.save();
  const FacilityModel = FacilityResource.createModel(facilitypayload);
  const facilityPromise = FacilityModel.save();
  const promises = [deviceOwnerPromise, facilityPromise];

  store.dispatch('SET_SUBMITTED_STATE', true);

  Promise.all(promises).then(
    responses => {
      kolibriLogin(store, deviceownerpayload, true);
    },
    error => {
      store.dispatch('SET_SUBMITTED_STATE', false);
      handleApiError(store, error);
    }
  );
}

export { createDeviceOwnerAndFacility };
