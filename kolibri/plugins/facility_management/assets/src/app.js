import router from 'kolibri.coreVue.router';
import RootVue from './views/FacilityIndex';
import routes from './routes';
import pluginModule from './modules/pluginModule';
import KolibriApp from 'kolibri_app';

class FacilityManagementModule extends KolibriApp {
  get routes() {
    return routes;
  }
  get RootVue() {
    return RootVue;
  }
  get pluginModule() {
    return pluginModule;
  }
  ready() {
    return super.ready().then(() => {
      // reset module states after leaving their respective page
      router.afterEach((toRoute, fromRoute) => {
        this.store.dispatch('resetModuleState', { toRoute, fromRoute });
      });
    });
  }
}

export default new FacilityManagementModule();
