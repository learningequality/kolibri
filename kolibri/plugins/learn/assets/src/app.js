import router from 'kolibri.coreVue.router';
import store from 'kolibri.coreVue.vuex.store';
import { blockDoubleClicks } from 'kolibri.coreVue.vuex.actions';
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
  get initialState() {
    return initialState;
  }
  get mutations() {
    return mutations;
  }
  ready() {
    // after every navigation, block double-clicks
    return super.ready().then(() => {
      router.getInstance().afterEach(() => {
        blockDoubleClicks(store);
      });
    });
  }
}

export default new LearnModule();
