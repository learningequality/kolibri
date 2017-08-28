import { DeviceProvisionResource } from 'kolibri.resources';
import { kolibriLogin, handleApiError } from 'kolibri.coreVue.vuex.actions';

function provisionDevice(store, superuser, facility, preset, language_code) {
  const DeviceProvisionModel = DeviceProvisionResource.createModel({
    superuser,
    facility,
    preset,
    language_code,
  });
  const deviceProvisionPromise = DeviceProvisionModel.save();

  store.dispatch('SET_SUBMITTED', true);

  deviceProvisionPromise.then(
    response => {
      superuser.facility = response.facility.id;
      kolibriLogin(store, superuser, true);
    },
    error => {
      store.dispatch('SET_SUBMITTED', false);
      handleApiError(store, error);
    }
  );
}

function goToNextStep(store) {
  store.dispatch('INCREMENT_ONBOARDING_STEP');
}

function goToPreviousStep(store) {
  store.dispatch('DECREMENT_ONBOARDING_STEP');
}

export { provisionDevice, goToNextStep, goToPreviousStep };
