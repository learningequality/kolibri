import RootVue from './views';
import prepareLearnApp from './state/prepareLearnApp';
import routes from './routes';
import { setFacilitiesAndConfig } from './state/actions/main';
import pluginModule from './state/pluginModule';
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
    return pluginModule;
  }
}

export default new LearnModule();
