import KolibriApp from 'kolibri_app'; // eslint-disable-line
import initialState from './state/initialState';
import mutations from './state/mutations';
import RootVue from './views';
import routes from './routes';

class DeviceManagementModule extends KolibriApp {
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

export default new DeviceManagementModule();
