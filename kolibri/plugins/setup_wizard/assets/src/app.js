import heartbeat from 'kolibri.heartbeat';
import logger from 'kolibri.lib.logging';
import RootVue from './views/SetupWizardIndex';
import pluginModule from './modules/pluginModule';
import routes from './routes';
import { SetupTasksResource } from './api';
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
    return super.ready().then(() => {
      logging.info('Clearing facility tasks created in previous sessions...');
      SetupTasksResource.cleartasks();
      // Fix for https://github.com/learningequality/kolibri/issues/3852
      // Don't call beat because it may cause a save in the session endpoint
      // while the device provisioning is in progress
      heartbeat.stopPolling();
    });
  }
}

export default new SetupWizardModule();
