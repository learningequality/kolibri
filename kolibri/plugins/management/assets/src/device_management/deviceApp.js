import KolibriApp from 'kolibri_app';
import RootVue from './views';
import mutations from './state/mutations';
import initialState from './state/initialState';
import { PageNames } from './constants';
import preparePage from '../state/preparePage';
import {
  showManagePermissionsPage,
  showUserPermissionsPage,
} from './state/actions/managePermissionsActions';
import { showManageContentPage } from './state/actions/manageContentActions';
import store from 'kolibri.coreVue.vuex.store';

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
];

class DeviceManagementModule extends KolibriApp {
  get routes() {
    return routes;
  }
  get RootVue() {
    return RootVue;
  }
  get initialState() {
    return initialState;
  }
  get mutations() {
    return mutations;
  }
}

export default new DeviceManagementModule();
