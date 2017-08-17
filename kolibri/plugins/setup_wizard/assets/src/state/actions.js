import { DeviceProvisionResource } from 'kolibri.resources';
import { kolibriLogin, handleApiError } from 'kolibri.coreVue.vuex.actions';

export function provisionDevice(store, superuser, facility, dataset, languageCode) {
  const DeviceProvisionModel = DeviceProvisionResource.createModel({
    superuser,
    facility,
    dataset,
    language_code: languageCode,
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
