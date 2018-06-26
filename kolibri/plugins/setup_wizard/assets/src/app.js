import heartbeat from 'kolibri.heartbeat';
import RootVue from './views';
import { initialState, mutations } from './state/store'; // attaching store to the root element
import KolibriApp from 'kolibri_app';

class OnboardingApp extends KolibriApp {
  get RootVue() {
    return RootVue;
  }
  get initialState() {
    return initialState;
  }
  get mutations() {
    return mutations;
  }
  ready() {
    return super.ready().then(() => {
      // Fix for https://github.com/learningequality/kolibri/issues/3852
      // Don't call beat because it may cause a save in the session endpoint
      // while the device provisioning is in progress
      heartbeat.stop();
    });
  }
}

export default new OnboardingApp();
