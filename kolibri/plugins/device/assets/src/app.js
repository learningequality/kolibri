import router from 'kolibri.coreVue.router';
import RootVue from './views/DeviceIndex';
import routes from './routes';
import pluginModule from './modules/pluginModule';
import KolibriApp from 'kolibri_app';

class DeviceManagementModule extends KolibriApp {
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
    // reset module states after leaving their respective page
    router.beforeEach((to, from, next) => {
      if (this.store.state.core.facilities.length === 0) {
        this.store.dispatch('getFacilities').then(next, next);
      }
      next();
    });
    router.afterEach((toRoute, fromRoute) => {
      this.store.dispatch('resetModuleState', { toRoute, fromRoute });
    });
    super.ready();
  }
}

export default new DeviceManagementModule();
