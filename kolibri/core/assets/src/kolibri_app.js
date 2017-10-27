import KolibriModule from 'kolibri_module';
import { getCurrentSession } from 'kolibri.coreVue.vuex.actions';
import router from 'kolibri.coreVue.router';
import Vue from 'kolibri.lib.vue';
import store from 'kolibri.coreVue.vuex.store';

/*
 * A class for single page apps that control routing and vuex state.
 * Override the routes, mutations, initialState, and RootVue getters.
 */
export default class KolibriApp extends KolibriModule {
  get routes() {
    return [];
  }
  get mutations() {
    return {};
  }
  get initialState() {
    return {};
  }
  get RootVue() {
    return {};
  }
  get store() {
    return store;
  }
  ready() {
    store.registerModule({
      state: this.initialState,
      mutations: this.mutations,
    });
    getCurrentSession(this.store).then(() => {
      this.rootvue = new Vue(
        Object.assign(
          {
            el: 'rootvue',
            store: store,
            router: router.init(this.routes),
          },
          this.RootVue
        )
      );
    });
  }
}
