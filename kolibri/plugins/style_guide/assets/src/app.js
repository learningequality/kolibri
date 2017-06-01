const KolibriModule = require('kolibri_module');
const Vue = require('kolibri.lib.vue');
const RootVue = require('./views');
const VueRouter = require('vue-router');
const router = require('kolibri.coreVue.router');
const {navigationMenuRoutes} = require('./views/shell/navigation-menu');

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
