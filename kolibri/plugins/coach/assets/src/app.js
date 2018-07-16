import { setChannelInfo } from 'kolibri.coreVue.vuex.actions';
import RootVue from './views/CoachRoot';
import routes from './routes';
import pluginModule from './state/pluginModule';
import KolibriApp from 'kolibri_app';

class CoachToolsModule extends KolibriApp {
  get stateSetters() {
    return [setChannelInfo];
  }
  get routes() {
    return routes;
  }
  // IDEA swap base page components at root level?
  get RootVue() {
    return RootVue;
  }
  get pluginModule() {
    return pluginModule;
  }
}

export default new CoachToolsModule();
