import store from 'kolibri.coreVue.vuex.store';
import { showDeviceInfoPage } from '../modules/deviceInfo/handlers';
import { showManagePermissionsPage } from '../modules/managePermissions/handlers';
import { showManageContentPage } from '../modules/manageContent/handlers';
import { showUserPermissionsPage } from '../modules/userPermissions/handlers';
import { PageNames } from '../constants';
import DeleteExportChannelsPage from '../views/ManageContentPage/DeleteExportChannelsPage';
import DeviceInfoPage from '../views/DeviceInfoPage';
import DeviceSettingsPage from '../views/DeviceSettingsPage';
import ManageContentPage from '../views/ManageContentPage';
import ManagePermissionsPage from '../views/ManagePermissionsPage';
import ManageTasksPage from '../views/ManageTasksPage';
import NewChannelVersionPage from '../views/ManageContentPage/NewChannelVersionPage';
import RearrangeChannelsPage from '../views/RearrangeChannelsPage';
import UserPermissionsPage from '../views/UserPermissionsPage';
import withAuthMessage from '../views/withAuthMessage';
import wizardTransitionRoutes from './wizardTransitionRoutes';

function hideLoadingScreen() {
  store.commit('CORE_SET_PAGE_LOADING', false);
}

function defaultHandler(toRoute) {
  store.dispatch('preparePage', { name: toRoute.name });
  hideLoadingScreen();
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
    component: withAuthMessage(ManageContentPage, 'contentManager'),
    path: '/content',
    handler: ({ name }) => {
      store.dispatch('preparePage', { name });
      showManageContentPage(store).then(hideLoadingScreen);
    },
  },
  {
    name: PageNames.MANAGE_PERMISSIONS_PAGE,
    component: withAuthMessage(ManagePermissionsPage, 'superuser'),
    path: '/permissions',
    handler: ({ name }) => {
      store.dispatch('preparePage', { name });
      showManagePermissionsPage(store).then(hideLoadingScreen);
    },
  },
  {
    name: PageNames.USER_PERMISSIONS_PAGE,
    component: withAuthMessage(UserPermissionsPage, 'superuser'),
    path: '/permissions/:userId',
    handler: ({ params, name }) => {
      store.dispatch('preparePage', { name });
      showUserPermissionsPage(store, params.userId);
    },
  },
  {
    name: PageNames.DEVICE_INFO_PAGE,
    component: withAuthMessage(DeviceInfoPage, 'contentManager'),
    path: '/info',
    handler: ({ name }) => {
      store.dispatch('preparePage', { name });
      showDeviceInfoPage(store).then(hideLoadingScreen);
    },
  },
  {
    name: PageNames.DEVICE_SETTINGS_PAGE,
    component: withAuthMessage(DeviceSettingsPage, 'admin'),
    path: '/settings',
    handler: defaultHandler,
  },
  {
    name: PageNames.DELETE_CHANNELS,
    path: '/content/delete_channels',
    component: withAuthMessage(DeleteExportChannelsPage, 'contentManager'),
    props: {
      actionType: 'delete',
    },
    handler: defaultHandler,
  },
  {
    name: PageNames.EXPORT_CHANNELS,
    path: '/content/export_channels',
    component: withAuthMessage(DeleteExportChannelsPage, 'contentManager'),
    props: {
      actionType: 'export',
    },
    handler: defaultHandler,
  },
  {
    name: PageNames.REARRANGE_CHANNELS,
    path: '/content/rearrange_channels',
    component: withAuthMessage(RearrangeChannelsPage, 'contentManager'),
    handler: defaultHandler,
  },
  {
    name: PageNames.MANAGE_TASKS,
    path: '/content/manage_tasks',
    component: withAuthMessage(ManageTasksPage, 'contentManager'),
    handler: defaultHandler,
  },
  {
    name: PageNames.NEW_CHANNEL_VERSION_PAGE,
    // same params as SELECT_CONTENT: ?drive_id, ?address_id
    path: '/content/manage_channel/:channel_id/upgrade',
    component: withAuthMessage(NewChannelVersionPage, 'contentManager'),
    handler: defaultHandler,
  },
  ...wizardTransitionRoutes,
  {
    path: '/content/*',
    redirect: '/content',
  },
];

export default routes;
