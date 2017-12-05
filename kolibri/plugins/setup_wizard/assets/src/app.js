import KolibriApp from 'kolibri_app';
import RootVue from './views';
import { initialState, mutations } from './state/store'; // attaching store to the root element

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
}

export default new OnboardingApp();
