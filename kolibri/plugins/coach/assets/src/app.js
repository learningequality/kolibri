import { setChannelInfo } from 'kolibri.coreVue.vuex.actions';
import router from 'kolibri.coreVue.router';
import RootVue from './views/CoachIndex';
import routes from './routes';
import pluginModule from './modules/pluginModule';
import KolibriApp from 'kolibri_app';

class CoachToolsModule extends KolibriApp {
  get stateSetters() {
    return [setChannelInfo];
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
    router.beforeEach((to, from, next) => {
      this.store.commit('SET_PAGE_NAME', to.name);
      if (to.name !== 'CoachClassListPage') {
        this.store
          .dispatch('initClassInfo', to.params.classId)
          .then(next, error => this.store.dispatch('handleApiError', error));
      } else {
        next();
      }
    });
    router.afterEach((toRoute, fromRoute) => {
      this.store.dispatch('resetModuleState', { toRoute, fromRoute });
    });
    return super.ready();
  }
}

export default new CoachToolsModule();
