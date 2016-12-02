const KolibriModule = require('kolibri_module');

const Vue = require('kolibri.lib.vue');


class SetupWizardModule extends KolibriModule {
  ready() {
    this.vm = new Vue({
      el: 'body',
      components: {
        rootvue: require('./vue'),
      },
    });
  }
}

module.exports = new SetupWizardModule();
