import KolibriModule from 'kolibri_module';
import { getCurrentSession } from 'kolibri.coreVue.vuex.actions';
import router from 'kolibri.coreVue.router';
import Vue from 'kolibri.lib.vue';
import RootVue from './views';
import store from './state/store';
import { PageNames } from './constants';
import preparePage from '../state/preparePage';
import { showPermissionsPage } from './state/actions/permissionsActions';
import { showContentPage } from './state/actions/contentActions';

const routes = [
  {
    path: '/',
    redirect: '/content',
  },
  {
    name: PageNames.DEVICE_CONTENT_MGMT_PAGE,
    path: '/content',
    handler: () => {
      preparePage(store.dispatch, {
        name: PageNames.DEVICE_CONTENT_MGMT_PAGE,
        title: 'Manage Content',
      });
      showContentPage(store).then(function onSuccess() {
        store.dispatch('CORE_SET_PAGE_LOADING', false);
      });
    },
  },
  {
    name: PageNames.DEVICE_PERMISSIONS_MGMT_PAGE,
    path: '/permissions',
    handler: () => {
      preparePage(store.dispatch, {
        name: PageNames.DEVICE_PERMISSIONS_MGMT_PAGE,
        title: 'Mange User Permissions',
      });
      showPermissionsPage(store).then(function onSuccess() {
        store.dispatch('CORE_SET_PAGE_LOADING', false);
      });
    },
  },
  {
    name: PageNames.USER_PERMISSIONS_MGMT_PAGE,
    path: '/permissions/:userid',
    handler: (toRoute) => {
      preparePage(store.dispatch, {
        name: PageNames.USER_PERMISSIONS_MGMT_PAGE,
        title: 'Manage User Device Permissions',
        isAsync: false,
      });
      console.log(toRoute);
    },
  }
];

class ManagementModule extends KolibriModule {
  ready() {
    getCurrentSession(store).then(() => {
      this.rootvue = new Vue({
        el: 'rootvue',
        render: createElement => createElement(RootVue),
        router: router.init(routes),
      });
    });
  }
}

export default new ManagementModule();
