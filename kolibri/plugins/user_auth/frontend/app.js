import router from 'kolibri/router';
import KolibriApp from 'kolibri-app';
import RootVue from './views/UserAuthIndex';
import routes from './routes';
import pluginModule from './modules/pluginModule';

class UserAuthModule extends KolibriApp {
  get stateSetters() {
    return [() => this.store.dispatch('setFacilitiesAndConfig')];
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
  ready() {
    router.afterEach((toRoute, fromRoute) => {
      this.store.dispatch('resetModuleState', { toRoute, fromRoute });
    });
    super.ready();
  }
}

export default new UserAuthModule();
