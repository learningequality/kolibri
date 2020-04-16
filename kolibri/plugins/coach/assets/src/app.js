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
      const promises = [];
      // Clear the snackbar at every navigation to prevent it from re-appearing
      // when the next page component mounts.
      if (this.store.state.core.snackbar.isVisible) {
        this.store.dispatch('clearSnackbar');
      }
      this.store.commit('SET_PAGE_NAME', to.name);
      if (
        to.name &&
        !['CoachClassListPage', 'StatusTestPage', 'CoachPrompts', 'AllFacilitiesPage'].includes(
          to.name
        )
      ) {
        promises.push(this.store.dispatch('initClassInfo', to.params.classId));
      } else {
        this.store.dispatch('coachNotifications/stopPolling');
      }
      if (this.store.getters.isSuperuser && this.store.state.core.facilities.length === 0) {
        promises.push(this.store.dispatch('getFacilities').catch(() => {}));
      }
      if (promises.length > 0) {
        Promise.all(promises).then(next, error => {
          this.store.dispatch('handleApiError', error);
        });
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
