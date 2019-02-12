import heartbeat from 'kolibri.heartbeat';
import RootVue from './views/SetupWizardIndex';
import pluginModule from './modules/pluginModule';
import KolibriApp from 'kolibri_app';

class OnboardingApp extends KolibriApp {
  get RootVue() {
    return RootVue;
  }
  get pluginModule() {
    return pluginModule;
  }
  ready() {
    return super.ready().then(() => {
      // Fix for https://github.com/learningequality/kolibri/issues/3852
      // Don't call beat because it may cause a save in the session endpoint
      // while the device provisioning is in progress
      heartbeat.stopPolling();
    });
  }
}

export default new OnboardingApp();
