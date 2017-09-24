import { DeviceProvisionResource } from 'kolibri.resources';
import { kolibriLogin, handleApiError } from 'kolibri.coreVue.vuex.actions';

function provisionDevice(store, onboardingData) {
  const DeviceProvisionModel = DeviceProvisionResource.createModel(onboardingData);
  const deviceProvisionPromise = DeviceProvisionModel.save();

  const { superuser } = onboardingData;

  store.dispatch('SET_LOADING', true);

  deviceProvisionPromise.then(
    response => {
      superuser.facility = response.facility.id;
      kolibriLogin(store, superuser, true);
    },
    error => {
      store.dispatch('SET_ERROR', true);
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
