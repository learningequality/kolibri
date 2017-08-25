import KolibriModule from 'kolibri_module';
import { getCurrentSession } from 'kolibri.coreVue.vuex.actions';
import router from 'kolibri.coreVue.router';
import Vue from 'kolibri.lib.vue';
import RootVue from './views';
import store from './state/store';
import { PageNames } from './constants';
import preparePage from '../state/preparePage';
import { showManagePermissionsPage, showUserPermissionsPage } from './state/actions/permissionsActions';
import { showManageContentPage } from './state/actions/contentActions';

const routes = [
  {
    path: '/',
    redirect: '/content',
  },
  {
    name: PageNames.MANAGE_CONTENT_PAGE,
    path: '/content',
    handler: () => {
      preparePage(store.dispatch, {
        name: PageNames.MANAGE_CONTENT_PAGE,
        title: 'Manage Content',
      });
      showManageContentPage(store).then(function onSuccess() {
        store.dispatch('CORE_SET_PAGE_LOADING', false);
      });
    },
  },
  {
    name: PageNames.MANAGE_PERMISSIONS_PAGE,
    path: '/permissions',
    handler: () => {
      preparePage(store.dispatch, {
        name: PageNames.MANAGE_PERMISSIONS_PAGE,
        title: 'Manage User Permissions',
      });
      showManagePermissionsPage(store).then(function onSuccess() {
        store.dispatch('CORE_SET_PAGE_LOADING', false);
      });
    },
  },
  {
    name: PageNames.USER_PERMISSIONS_PAGE,
    path: '/permissions/:userid',
    handler: toRoute => {
      preparePage(store.dispatch, {
        name: PageNames.USER_PERMISSIONS_PAGE,
        title: 'Manage User Device Permissions',
      });
      showUserPermissionsPage(store, toRoute.params.userid).then(function onSuccess() {
        store.dispatch('CORE_SET_PAGE_LOADING', false);
      });
    },
  },
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
