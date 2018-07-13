import store from 'kolibri.coreVue.vuex.store';
import { showDeviceInfoPage } from '../state/actions/deviceInfoActions';
import { showManageContentPage } from '../state/actions/manageContentActions';
import {
  showManagePermissionsPage,
  showUserPermissionsPage,
} from '../state/actions/managePermissionsActions';
import preparePage from '../state/preparePage';
import { PageNames } from '../constants';
import wizardTransitionRoutes from './wizardTransitionRoutes';

function hideLoadingScreen() {
  store.commit('CORE_SET_PAGE_LOADING', false);
}

const routes = [
  {
    path: '/',
    redirect: '/content',
  },
  {
    path: '/welcome',
    redirect: () => {
      store.commit('SET_WELCOME_MODAL_VISIBLE', true);
      return '/content';
    },
  },
  {
    name: PageNames.MANAGE_CONTENT_PAGE,
    path: '/content',
    handler: ({ name }) => {
      preparePage(store.commit, {
        name,
      });
      showManageContentPage(store).then(hideLoadingScreen);
    },
  },
  {
    name: PageNames.MANAGE_PERMISSIONS_PAGE,
    path: '/permissions',
    handler: ({ name }) => {
      preparePage(store.commit, {
        name,
      });
      showManagePermissionsPage(store).then(hideLoadingScreen);
    },
  },
  {
    name: PageNames.USER_PERMISSIONS_PAGE,
    path: '/permissions/:userid',
    handler: ({ params, name }) => {
      preparePage(store.commit, {
        name,
      });
      showUserPermissionsPage(store, params.userid).then(hideLoadingScreen);
    },
  },
  {
    name: PageNames.DEVICE_INFO_PAGE,
    path: '/info',
    handler: ({ name }) => {
      preparePage(store.commit, {
        name,
      });
      showDeviceInfoPage(store).then(hideLoadingScreen);
    },
  },
  ...wizardTransitionRoutes,
  {
    path: '/content/*',
    redirect: '/content',
  },
];

export default routes;
