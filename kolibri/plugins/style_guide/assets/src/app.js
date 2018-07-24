import Vue from 'kolibri.lib.vue';
import router from 'kolibri.coreVue.router';
import Vuep from 'vuep';
import RootVue from './views';
import { navMenuRoutes } from './views/shell/nav-menu';
import KolibriModule from 'kolibri_module';

Vue.use(Vuep, { lineNumbers: false });

class StyleGuideModule extends KolibriModule {
  ready() {
    document.title = 'Kolibri Style Guide';
    this.rootvue = new Vue({
      el: 'rootvue',
      name: 'StyleGuideRoot',
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
