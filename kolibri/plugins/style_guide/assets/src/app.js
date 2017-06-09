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
      router: router.init(navigationMenuRoutes)
    });
  }
}

module.exports = new StyleGuideModule();
