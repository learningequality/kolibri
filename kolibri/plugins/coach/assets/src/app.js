import KolibriApp from 'kolibri_app';
import RootVue from './views';
import { setChannelInfo } from 'kolibri.coreVue.vuex.actions';
import { initialState, mutations } from './state/store';
import routes from './routes';

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
  get initialState() {
    return initialState;
  }
  get mutations() {
    return mutations;
  }
}

export default new CoachToolsModule();
