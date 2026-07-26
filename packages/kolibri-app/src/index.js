import router from 'kolibri/router';
import logger from 'kolibri-logging';
import Vue from 'vue';
import heartbeat from 'kolibri/heartbeat';
import KolibriModule from 'kolibri-module';

export const logging = logger.getLogger(__filename);

/*
 * A class for single page apps that control routing and the root component.
 * Override the routes and RootVue getters.
 */
export default class KolibriApp extends KolibriModule {
  /*
   * @return {Array[Object]} Array of objects that define vue-router route configurations.
   *                         These will get passed to our internal router.
   */
  get routes() {
    return [];
  }

  /*
   * @return {Object} Root options for this single page app — a component definition, plus
   *                  any other `new Vue()` option the plugin needs, such as a `store`.
   */
  get RootVue() {
    // By default return the component that just renders router-view,
    // which will render the component for the current route.
    return {
      functional: true,
      render: createElement => createElement('router-view'),
    };
  }

  startRootVue() {
    this.rootvue = new Vue({
      el: 'rootvue',
      router: router.initRoutes(this.routes),
      ...this.RootVue,
    });
  }

  ready() {
    // Refresh session state when the user returns to the SPA via back/forward navigation,
    // so any auth changes that occurred since the page was cached are reflected immediately.
    window.addEventListener('pageshow', event => {
      const navType = performance.getEntriesByType('navigation')[0]?.type;
      if (event.persisted || navType === 'back_forward') {
        heartbeat.pollSessionEndPoint();
      }
    });
    return heartbeat.startPolling().then(() => this.startRootVue());
  }
}
