import initialState from './state/initialState';
import mutations from './state/mutations';
import RootVue from './views';
import routes from './routes';
import KolibriApp from 'kolibri_app';

class DeviceManagementModule extends KolibriApp {
  get routes() {
    return routes;
  }
  get RootVue() {
    return RootVue;
  }
  get pluginModule() {
    return {
      state: initialState,
      mutations,
    };
  }
}

export default new DeviceManagementModule();
