import router from 'kolibri.coreVue.router';
import RootVue from './views/LearnIndex';
import routes from './routes';
import { setFacilitiesAndConfig, prepareLearnApp } from './modules/coreLearn/actions';
import pluginModule from './modules/pluginModule';
import { PageNames } from './constants';
import KolibriApp from 'kolibri_app';

class LearnModule extends KolibriApp {
  get stateSetters() {
    return [prepareLearnApp, setFacilitiesAndConfig];
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
    // If we are not logged in and are forbidden from accessing as guest
    // redirect to CONTENT_UNAVAILABLE.
    router.beforeEach((to, from, next) => {
      if (
        to.name !== PageNames.CONTENT_UNAVAILABLE &&
        !this.store.state.allowGuestAccess &&
        !this.store.getters.isUserLoggedIn
      ) {
        // Pass the ?next param on to AuthMessage
        const currentURL = window.encodeURIComponent(window.location.href);
        router.replace({
          name: PageNames.CONTENT_UNAVAILABLE,
          query: {
            next: currentURL,
          },
        });
      } else {
        next();
      }
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
