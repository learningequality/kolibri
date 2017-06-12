const KolibriModule = require('kolibri_module');
const Vue = require('kolibri.lib.vue');
const RootVue = require('./views');
const router = require('kolibri.coreVue.router');
const { navigationMenuRoutes } = require('./views/shell/navigation-menu');
const Vuep = require('vuep');

Vue.use(Vuep);

class StyleGuideModule extends KolibriModule {
  ready() {
    this.rootvue = new Vue({
      el: 'rootvue',
      name: 'StyleGuideRoot',
      render: createElement => createElement(RootVue),
      router: router.init(navigationMenuRoutes, {
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
        }
      })
    });
  }
}

module.exports = new StyleGuideModule();
