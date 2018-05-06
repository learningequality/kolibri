import { setChannelInfo } from 'kolibri.coreVue.vuex.actions';
import RootVue from './views';
import { initialState, mutations } from './state/store';
import routes from './routes';
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
  get initialState() {
    return initialState;
  }
  get mutations() {
    return mutations;
  }
}

export default new CoachToolsModule();
