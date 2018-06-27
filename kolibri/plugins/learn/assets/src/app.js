import RootVue from './views';
import initialState from './state/initialState';
import mutations from './state/mutations';
import prepareLearnApp from './state/prepareLearnApp';
import routes from './routes';
import { setFacilitiesAndConfig } from './state/actions/main';
import KolibriApp from 'kolibri_app';

class LearnModule extends KolibriApp {
  get stateSetters() {
    return [prepareLearnApp, setFacilitiesAndConfig];
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

export default new LearnModule();
