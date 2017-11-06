import KolibriModule from 'kolibri_module';
import { getCurrentSession } from 'kolibri.coreVue.vuex.actions';
import router from 'kolibri.coreVue.router';
import Vue from 'kolibri.lib.vue';
import RootVue from './views';
import store from './state/store';
import { PageNames, ContentWizardPages } from './constants';
import preparePage from '../state/preparePage';
import {
  showManagePermissionsPage,
  showUserPermissionsPage,
} from './state/actions/managePermissionsActions';
import { transitionWizardPage } from './state/actions/contentWizardActions';
import { showManageContentPage } from './state/actions/manageContentActions';
import { updateTreeViewTopic } from './state/actions/contentTransferActions';
import get from 'lodash/get';

function hideLoadingScreen() {
  store.dispatch('CORE_SET_PAGE_LOADING', false);
}

const routes = [
  {
    path: '/',
    redirect: '/content',
  },
  {
    path: '/welcome',
    redirect: () => {
      store.dispatch('SET_WELCOME_MODAL_VISIBLE', true);
      return '/content';
    },
  },
  {
    name: PageNames.MANAGE_CONTENT_PAGE,
    path: '/content',
    handler: ({ name }) => {
      preparePage(store.dispatch, {
        name,
        title: 'Manage Device Content',
      });
      showManageContentPage(store).then(hideLoadingScreen);
    },
  },
  {
    name: PageNames.MANAGE_PERMISSIONS_PAGE,
    path: '/permissions',
    handler: ({ name }) => {
      preparePage(store.dispatch, {
        name,
        title: 'Manage Device Permissions',
      });
      showManagePermissionsPage(store).then(hideLoadingScreen);
    },
  },
  {
    name: PageNames.USER_PERMISSIONS_PAGE,
    path: '/permissions/:userid',
    handler: ({ params, name }) => {
      preparePage(store.dispatch, {
        name,
        title: 'Manage User Permissions',
      });
      showUserPermissionsPage(store, params.userid).then(hideLoadingScreen);
    },
  },
  // Special fake routes so we can use k-breadcrumbs inside of a modal
  {
    name: 'treeview_update_topic',
    path: '/content/topic',
    handler: ({ params }) => {
      // redirect if coming into URL directly without initiating workflow
      if (get(store.state.pageState, 'wizardState.page') !== ContentWizardPages.SELECT_CONTENT) {
        return router.replace('/content');
      }
      return updateTreeViewTopic(store, {
        pk: params.pk,
        title: params.title,
      }, params.replaceCrumbs);
    },
  },
  {
    name: 'wizardtransition',
    // Wizard transitions don't change the URL
    path: '',
    handler: ({ params }) => {
      if (params.transition === 'cancel') {
        transitionWizardPage(store, 'cancel');
      }
    },
  },
];

class DeviceManagementModule extends KolibriModule {
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

export default new DeviceManagementModule();
