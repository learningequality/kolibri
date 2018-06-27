import { DeviceProvisionResource } from 'kolibri.resources';
import { kolibriLogin, handleApiError } from 'kolibri.coreVue.vuex.actions';

export function provisionDevice(store, onboardingData) {
  const DeviceProvisionModel = DeviceProvisionResource.createModel(onboardingData);
  const deviceProvisionPromise = DeviceProvisionModel.save();

  const { superuser } = onboardingData;

  store.commit('SET_LOADING', true);

  deviceProvisionPromise.then(
    response => {
      superuser.facility = response.facility.id;
      kolibriLogin(store, superuser);
    },
    error => {
      store.commit('SET_ERROR', true);
      handleApiError(store, error);
    }
  );
}

export function goToNextStep(store) {
  store.commit('INCREMENT_ONBOARDING_STEP');
}

export function goToPreviousStep(store) {
  store.commit('DECREMENT_ONBOARDING_STEP');
}
