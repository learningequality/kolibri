import KolibriModule from 'kolibri_module';
import Vue from 'kolibri.lib.vue';
import RootVue from './views';
import store from './state/store'; // attaching store to the root element

class OnboardingModule extends KolibriModule {
  ready() {
    const onboardingComponent = {
      el: 'rootvue',
      store,
    };
    this.vm = new Vue(Object.assign(onboardingComponent, RootVue));
  }
}

export default new OnboardingModule();
