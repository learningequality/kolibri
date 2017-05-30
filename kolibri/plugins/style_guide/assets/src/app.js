const KolibriModule = require('kolibri_module');
const Vue = require('kolibri.lib.vue');
const RootVue = require('./views');

class StyleGuideModule extends KolibriModule {
  ready() {
    this.rootvue = new Vue({
      el: 'rootvue',
      name: 'StyleGuideRoot',
      render: createElement => createElement(RootVue),
    });
  }
}

module.exports = new StyleGuideModule();
