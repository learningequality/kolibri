import router from 'kolibri/router';
import KolibriApp from 'kolibri-app';
import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';
import RootVue from './views/LearnIndex';
import routes from './routes';
import { prepareLearnApp } from './composables/useCoreLearn';
import pluginModule from './modules/pluginModule';
import { PageNames } from './constants';

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
    // If we are not logged in and are forbidden from accessing as guest
    // redirect to CONTENT_UNAVAILABLE.
    router.beforeEach((to, from, next) => {
      const { isUserLoggedIn } = useUser();
      if (
        to.name !== PageNames.CONTENT_UNAVAILABLE &&
        !this.store.state.allowGuestAccess &&
        !get(isUserLoggedIn)
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
      this.store.dispatch('resetModuleState', { toRoute, fromRoute });
    });
    super.ready();
  }
}

export default new LearnModule();
