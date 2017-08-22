import KolibriModule from 'kolibri_module';
import Vue from 'kolibri.lib.vue';
import RootVue from './views';
import store from './state/store'; // attaching store to the root element

class SetupWizardModule extends KolibriModule {
  ready() {
    this.vm = new Vue({
      el: 'rootvue',
      render: createElement => createElement(RootVue),
      store,
    });
  }
}

const setupWizardModule = new SetupWizardModule();

export default setupWizardModule;
