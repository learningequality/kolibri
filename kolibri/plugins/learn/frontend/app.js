import router from 'kolibri/router';
import KolibriApp from 'kolibri-app';
import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';
import RootVue from './views/LearnIndex';
import routes from './routes';
import store from './store';
import { prepareLearnApp } from './composables/useCoreLearn';
import { PageNames } from './constants';

class LearnModule extends KolibriApp {
  get routes() {
    return routes;
  }
  get RootVue() {
    return { ...RootVue, store };
  }
  startRootVue() {
    // The classes route guard reads `inClasses` synchronously, so this has to be
    // resolved before the router handles the first navigation — otherwise a cold
    // load of a class page redirects to the library. A failure leaves the learn
    // app flags at their defaults rather than blocking the app from mounting.
    return prepareLearnApp()
      .catch(() => {})
      .then(() => super.startRootVue());
  }
  ready() {
    // If we are not logged in and are forbidden from accessing as guest
    // redirect to CONTENT_UNAVAILABLE.
    router.beforeEach((to, from, next) => {
      const { isUserLoggedIn } = useUser();
      if (
        to.name !== PageNames.CONTENT_UNAVAILABLE &&
        !store.state.allowGuestAccess &&
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
      store.dispatch('resetModuleState', { toRoute, fromRoute });
    });
    super.ready();
  }
}

export default new LearnModule();
