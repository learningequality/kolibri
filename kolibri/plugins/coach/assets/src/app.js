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
      // Clear the snackbar at every navigation to prevent it from re-appearing
      // when the next page component mounts.
      if (this.store.state.core.snackbar.isVisible) {
        this.store.dispatch('clearSnackbar');
      }
      this.store.commit('SET_PAGE_NAME', to.name);
      if (!['CoachClassListPage', 'StatusTestPage'].includes(to.name)) {
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
    super.ready();
  }
}

export default new CoachToolsModule();
