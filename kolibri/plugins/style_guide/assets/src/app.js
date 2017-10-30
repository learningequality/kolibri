import KolibriModule from 'kolibri_module';
import Vue from 'kolibri.lib.vue';
import RootVue from './views';
import router from 'kolibri.coreVue.router';
import { navMenuRoutes } from './views/shell/nav-menu';
import Vuep from 'vuep';

Vue.use(Vuep, { lineNumbers: false });

class StyleGuideModule extends KolibriModule {
  ready() {
    this.rootvue = new Vue({
      name: 'styleGuideRoot',
      el: 'rootvue',
      render: createElement => createElement(RootVue),
      router: router.init(navMenuRoutes, {
        // Enable the anchor scrolling behavior (which requires the vue-router
        // to use the HTML5 History API).
        mode: 'history',
        scrollBehavior(to, from, savedPosition) {
          if (to.hash) {
            return { selector: to.hash };
          } else if (savedPosition) {
            return savedPosition;
          }

          return { x: 0, y: 0 };
        },
      }),
    });
  }
}

export default new StyleGuideModule();
