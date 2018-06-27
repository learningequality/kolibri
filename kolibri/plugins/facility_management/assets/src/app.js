import RootVue from './views';
import * as mutations from './state/mutations';
import initialState from './state/initialState';
import routes from './routes';
import KolibriApp from 'kolibri_app';

class FacilityManagementModule extends KolibriApp {
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
}

export default new FacilityManagementModule();
