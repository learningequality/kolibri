import RootVue from './views/DeviceIndex';
import routes from './routes';
import pluginModule from './state/pluginModule';
import KolibriApp from 'kolibri_app';

class DeviceManagementModule extends KolibriApp {
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

export default new DeviceManagementModule();
