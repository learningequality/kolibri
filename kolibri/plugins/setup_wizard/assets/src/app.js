import logger from 'kolibri.lib.logging';
import { TaskResource } from 'kolibri.resources';
import KolibriApp from 'kolibri_app';
import RootVue from './views/SetupWizardIndex';
import pluginModule from './modules/pluginModule';
import routes from './routes';

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
  }
}

export default new SetupWizardModule();
