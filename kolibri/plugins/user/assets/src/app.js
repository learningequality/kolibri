import RootVue from './views/UserRoot';
import routes from './routes';
import { setFacilitiesAndConfig } from './state/actions';
import pluginModule from './state/pluginModule';
import KolibriApp from 'kolibri_app';

class UserModule extends KolibriApp {
  get stateSetters() {
    return [setFacilitiesAndConfig];
  }
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

export default new UserModule();
