import Vue from 'kolibri.lib.vue';
import store from 'kolibri.coreVue.vuex.store';
import DemoServerIndex from './views/DemoServerIndex';
import KolibriModule from 'kolibri_module';

class DemoServerModule extends KolibriModule {
  ready() {
    if (!store.getters.isUserLoggedIn) {
      store.commit('SET_CORE_BANNER_CONTENT', DemoServerIndex);
    }
  }
}

export default new DemoServerModule();
