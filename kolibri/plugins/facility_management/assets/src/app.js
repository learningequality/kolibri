import RootVue from './views/FacilityIndex';
import routes from './routes';
import pluginModule from './state/pluginModule';
import KolibriApp from 'kolibri_app';

class FacilityManagementModule extends KolibriApp {
  get routes() {
    return routes;
  }
  get RootVue() {
    return RootVue;
  }
  get pluginModule() {
    return pluginModule;
  }
}

export default new FacilityManagementModule();
