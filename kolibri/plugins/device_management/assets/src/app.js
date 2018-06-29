import KolibriApp from 'kolibri_app'; // eslint-disable-line
import store from 'kolibri.coreVue.vuex.store';
import { createTranslator } from 'kolibri.utils.i18n';
import { showDeviceInfoPage } from './state/actions/deviceInfoActions';
import { showManageContentPage } from './state/actions/manageContentActions';
import {
  showManagePermissionsPage,
  showUserPermissionsPage,
} from './state/actions/managePermissionsActions';
import preparePage from './state/preparePage';
import { PageNames } from './constants';
import initialState from './state/initialState';
import mutations from './state/mutations';
import RootVue from './views';
import wizardTransitionRoutes from './wizardTransitionRoutes';

const translator = createTranslator('deviceAppPageTitles', {
  manageDeviceContent: 'Manage Device Content',
  manageDevicePermissions: 'Manage Device Permissions',
  manageUserPermissions: 'Manage User Permissions',
  deviceInfo: 'Device info',
});

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
        title: translator.$tr('manageDeviceContent'),
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
        title: translator.$tr('manageDevicePermissions'),
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
        title: translator.$tr('manageUserPermissions'),
      });
      showUserPermissionsPage(store, params.userid).then(hideLoadingScreen);
    },
  },
  {
    name: PageNames.DEVICE_INFO_PAGE,
    path: '/info',
    handler: ({ name }) => {
      preparePage(store.dispatch, {
        name,
        title: translator.$tr('deviceInfo'),
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
