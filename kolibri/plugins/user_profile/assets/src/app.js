import router from 'kolibri.coreVue.router';
import KolibriApp from 'kolibri_app';
import routes from './routes';
import pluginModule from './modules/pluginModule';

class UserProfileModule extends KolibriApp {
  get routes() {
    return routes;
  }
  get pluginModule() {
    return pluginModule;
  }
  ready() {
    router.afterEach((toRoute, fromRoute) => {
      this.store.dispatch('resetModuleState', { toRoute, fromRoute });
    });
    super.ready();
  }
}

export default new UserProfileModule();
