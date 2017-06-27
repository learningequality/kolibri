import { DeviceOwnerResource, FacilityResource } from 'kolibri.resources';
import * as coreActions from 'kolibri.coreVue.vuex.actions';

function createDeviceOwnerAndFacility(store, deviceownerpayload, facilitypayload) {
  const DeviceOwnerModel = DeviceOwnerResource.createModel(deviceownerpayload);
  const deviceOwnerPromise = DeviceOwnerModel.save();
  const FacilityModel = FacilityResource.createModel(facilitypayload);
  const facilityPromise = FacilityModel.save();
  const promises = [deviceOwnerPromise, facilityPromise];
  Promise.all(promises).then(
    responses => {
      coreActions.kolibriLogin(store, deviceownerpayload, true);
    },
    error => {
      coreActions.handleApiError(store, error);
    }
  );
}

export { createDeviceOwnerAndFacility };
