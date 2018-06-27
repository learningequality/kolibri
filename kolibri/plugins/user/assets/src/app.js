import RootVue from './views';
import { setFacilitiesAndConfig } from './state/actions';
import initialState from './state/initialState';
import mutations from './state/mutations';
import routes from './routes';
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
    return {
      state: initialState,
      mutations,
    };
  }
}

export default new UserModule();
