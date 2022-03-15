import router from 'kolibri.coreVue.router';
import RootVue from './views/LearnIndex';
import routes from './routes';
import { prepareLearnApp } from './composables/useCoreLearn';
import pluginModule from './modules/pluginModule';
import { PageNames } from './constants';
import KolibriApp from 'kolibri_app';

class LearnModule extends KolibriApp {
  get stateSetters() {
    return [prepareLearnApp];
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
      if (to.name !== PageNames.CONTENT_UNAVAILABLE && !this.store.getters.isUserLoggedIn) {
        // if we are not logged in and are forbidden from accessing as guest
        // redirect to content_unavailable.
        if (!this.store.state.allowGuestAccess) {
          // Pass the ?next param on to AuthMessage
          const currentURL = window.encodeURIComponent(window.location.href);
          router.replace({
            name: PageNames.CONTENT_UNAVAILABLE,
            query: {
              next: currentURL,
            },
          });
        }

        if (to.name === PageNames.BOOKMARKS) {
          this.store.commit('CORE_SET_ERROR', { response: { status: 403 } });
          this.store.commit('CORE_SET_PAGE_LOADING', false);
        }
      }
      next();
    });

    // after every navigation, block double-clicks
    router.afterEach((toRoute, fromRoute) => {
      this.store.dispatch('blockDoubleClicks');
      this.store.dispatch('resetModuleState', { toRoute, fromRoute });
    });
    super.ready();
  }
}

export default new LearnModule();
