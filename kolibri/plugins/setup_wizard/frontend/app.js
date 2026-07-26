import logger from 'kolibri-logging';
import TaskResource from 'kolibri/apiResources/TaskResource';
import KolibriApp from 'kolibri-app';
import RootVue from './views/SetupWizardIndex';
import store from './store';
import routes from './routes';

const logging = logger.getLogger(__filename);

class SetupWizardModule extends KolibriApp {
  get RootVue() {
    return { ...RootVue, store };
  }
  get routes() {
    return routes;
  }
  ready() {
    // Fix for https://github.com/learningequality/kolibri/issues/3852
    // Override the base ready method, so that we don't start the session
    // heartbeat checks.
    // Don't call beat because it may cause a save in the session endpoint
    // while the device provisioning is in progress
    logging.info('Clearing facility tasks created in previous sessions...');
    TaskResource.clearAll('facility_task');
    this.startRootVue();
  }
}

export default new SetupWizardModule();
