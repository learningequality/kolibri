const KolibriModule = require('kolibri.coreModules.kolibriModule');

const Vue = require('kolibri.lib.vue');

const RootVue = require('./vue');


class SetupWizardModule extends KolibriModule {
  ready() {
    this.vm = new Vue({
      el: 'rootvue',
      render: createElement => createElement(RootVue),
    });
  }
}

module.exports = new SetupWizardModule();
