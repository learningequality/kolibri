import KolibriModule from 'kolibri_module';

import Vue from 'kolibri.lib.vue';

import RootVue from './views';


class SetupWizardModule extends KolibriModule {
  ready() {
    this.vm = new Vue({
      el: 'rootvue',
      render: createElement => createElement(RootVue),
    });
  }
}

const setupWizardModule = new SetupWizardModule();

export { setupWizardModule as default };
