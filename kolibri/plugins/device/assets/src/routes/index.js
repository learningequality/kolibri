import store from 'kolibri.coreVue.vuex.store';
import { showDeviceInfoPage } from '../modules/deviceInfo/handlers';
import { showManagePermissionsPage } from '../modules/managePermissions/handlers';
import { showManageContentPage } from '../modules/manageContent/handlers';
import { showUserPermissionsPage } from '../modules/userPermissions/handlers';
import { PageNames } from '../constants';
import DeleteExportChannelsPage from '../views/ManageContentPage/DeleteExportChannelsPage';
import RearrangeChannelsPage from '../views/RearrangeChannelsPage';
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
      store.dispatch('preparePage', { name });
      showManageContentPage(store).then(hideLoadingScreen);
    },
  },
  {
    name: PageNames.MANAGE_PERMISSIONS_PAGE,
    path: '/permissions',
    handler: ({ name }) => {
      store.dispatch('preparePage', { name });
      showManagePermissionsPage(store).then(hideLoadingScreen);
    },
  },
  {
    name: PageNames.USER_PERMISSIONS_PAGE,
    path: '/permissions/:userId',
    handler: ({ params, name }) => {
      store.dispatch('preparePage', { name });
      showUserPermissionsPage(store, params.userId);
    },
  },
  {
    name: PageNames.DEVICE_INFO_PAGE,
    path: '/info',
    handler: ({ name }) => {
      store.dispatch('preparePage', { name });
      showDeviceInfoPage(store).then(hideLoadingScreen);
    },
  },
  {
    name: PageNames.DEVICE_SETTINGS_PAGE,
    path: '/settings',
    handler: ({ name }) => {
      store.dispatch('preparePage', { name });
      hideLoadingScreen();
    },
  },
  {
    name: 'DELETE_CHANNELS',
    path: '/content/delete_channels',
    component: DeleteExportChannelsPage,
    props: {
      actionType: 'delete',
    },
    handler() {
      store.dispatch('preparePage', { name: 'DELETE_CHANNELS' });
      hideLoadingScreen();
    },
  },
  {
    name: 'EXPORT_CHANNELS',
    path: '/content/export_channels',
    component: DeleteExportChannelsPage,
    props: {
      actionType: 'export',
    },
    handler({ name }) {
      store.dispatch('preparePage', { name });
      hideLoadingScreen();
    },
  },
  {
    name: 'REARRANGE_CHANNELS',
    path: '/content/rearrange_channels',
    component: RearrangeChannelsPage,
    handler({ name }) {
      store.dispatch('preparePage', { name });
    },
  },
  {
    name: 'MANAGE_TASKS',
    path: '/content/manage_tasks',
    component: DeleteExportChannelsPage,
    props: {
      actionType: 'export',
    },
    handler({ name }) {
      store.dispatch('preparePage', { name });
    },
  },
  ...wizardTransitionRoutes,
  {
    path: '/content/*',
    redirect: '/content',
  },
];

export default routes;
