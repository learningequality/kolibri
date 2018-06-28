import RootVue from './views';
import pluginModule from './state/pluginModule';
import KolibriApp from 'kolibri_app';

class OnboardingApp extends KolibriApp {
  get RootVue() {
    return RootVue;
  }
  get pluginModule() {
    return pluginModule;
  }
}

export default new OnboardingApp();
