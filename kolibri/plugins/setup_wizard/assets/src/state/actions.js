import { DeviceProvisionResource } from 'kolibri.resources';
import { kolibriLogin, handleApiError } from 'kolibri.coreVue.vuex.actions';

export function provisionDevice(store, superuser, facility, preset, language_code) {
  const DeviceProvisionModel = DeviceProvisionResource.createModel({
    superuser,
    facility,
    preset,
    language_code,
  });
  const deviceProvisionPromise = DeviceProvisionModel.save();

  store.dispatch('SET_SUBMITTED_STATE', true);

  deviceProvisionPromise.then(
    response => {
      superuser.facility = response.facility.id;
      kolibriLogin(store, superuser, true);
    },
    error => {
      store.dispatch('SET_SUBMITTED_STATE', false);
      handleApiError(store, error);
    }
  );
}
