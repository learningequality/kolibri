import logger from 'kolibri.lib.logging';
import { TaskResource } from 'kolibri.resources';
import RootVue from './views/SetupWizardIndex';
import pluginModule from './modules/pluginModule';
import routes from './routes';
import router from 'kolibri.coreVue.router';

import KolibriApp from 'kolibri_app';

const logging = logger.getLogger(__filename);

class SetupWizardModule extends KolibriApp {
  get RootVue() {
    return RootVue;
  }
  get routes() {
    return routes;
  }
  get pluginModule() {
    return pluginModule;
  }
  ready() {
    // Fix for https://github.com/learningequality/kolibri/issues/3852
    // Override the base ready method, so that we don't start the session
    // heartbeat checks.
    // Don't call beat because it may cause a save in the session endpoint
    // while the device provisioning is in progress
    this.setupVue();
    logging.info('Clearing facility tasks created in previous sessions...');
    TaskResource.clearAll('facility_task');
    this.startRootVue();

    // this is getting hit, but don't currently have a way to convey
    // the necessary information
    router.afterEach((to, from) => {
      console.log('routeAFTEREACH')
      console.log('TO, FROM', to, from);
      // want to SEND 'PUSH HISTORY' event but do not have access to the wizard
    });
  }
}

export default new SetupWizardModule();
