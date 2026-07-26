import router from 'kolibri/router';
import KolibriApp from 'kolibri-app';
import routes from './routes';
import store from './store';

class UserProfileModule extends KolibriApp {
  get routes() {
    return routes;
  }
  get RootVue() {
    return { ...super.RootVue, store };
  }
  ready() {
    router.afterEach((toRoute, fromRoute) => {
      store.dispatch('resetModuleState', { toRoute, fromRoute });
    });
    super.ready();
  }
}

export default new UserProfileModule();
