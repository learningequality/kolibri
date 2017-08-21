import KolibriModule from 'kolibri_module';
import { getCurrentSession } from 'kolibri.coreVue.vuex.actions';
import router from 'kolibri.coreVue.router';
import Vue from 'kolibri.lib.vue';
import RootVue from './views';
import store from './state/store';
import { PageNames } from './constants';

const routes = [
  {
    path: '/',
    redirect: '/content',
  },
  {
    name: PageNames.DEVICE_CONTENT_MGMT_PAGE,
    path: '/content',
    handler: (toRoute) => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      return store.dispatch('SET_PAGE_NAME', 'yoyo');
    },
  },
  {
    name: PageNames.DEVICE_PERMISSIONS_MGMT_PAGE,
    path: '/permissions',
    handler: (toRoute) => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      return store.dispatch('SET_PAGE_NAME', 'yoyo');
    },
  }
];

class ManagementModule extends KolibriModule {
  ready() {
    getCurrentSession(store)
    .then(() => {
      this.rootvue = new Vue({
        el: 'rootvue',
        render: createElement => createElement(RootVue),
        router: router.init(routes),
      });
    });
  }
}

export default new ManagementModule();
