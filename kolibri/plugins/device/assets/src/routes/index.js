import store from 'kolibri/store';
import ManageSyncSchedule from 'kolibri-common/components/SyncSchedule/ManageSyncSchedule';
import EditDeviceSyncSchedule from 'kolibri-common/components/SyncSchedule/EditDeviceSyncSchedule';
import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';
import { showDeviceInfoPage } from '../modules/deviceInfo/handlers';
import { showManagePermissionsPage } from '../modules/managePermissions/handlers';
import { showManageContentPage } from '../modules/manageContent/handlers';
import { showUserPermissionsPage } from '../modules/userPermissions/handlers';
import DeleteExportChannelsPage from '../views/ManageContentPage/DeleteExportChannelsPage';
import DeviceInfoPage from '../views/DeviceInfoPage';
import DeviceSettingsPage from '../views/DeviceSettingsPage';
import FacilitiesPage from '../views/FacilitiesPage';
import FacilitiesTasksPage from '../views/FacilitiesPage/FacilitiesTasksPage';
import ManageContentPage from '../views/ManageContentPage';
import ManagePermissionsPage from '../views/ManagePermissionsPage';
import ManageTasksPage from '../views/ManageTasksPage';
import NewChannelVersionPage from '../views/ManageContentPage/NewChannelVersionPage';
import RearrangeChannelsPage from '../views/RearrangeChannelsPage';
import UserPermissionsPage from '../views/UserPermissionsPage';
import withAuthMessage from '../views/withAuthMessage';
import { PageNames } from '../constants';
import wizardTransitionRoutes from './wizardTransitionRoutes';

function hideLoadingScreen() {
  store.dispatch('notLoading');
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
    name: PageNames.MANAGE_CONTENT_PAGE,
    component: withAuthMessage(ManageContentPage, 'contentManager'),
    path: '/content',
    handler: ({ name }) => {
      store.dispatch('preparePage', { name });
      showManageContentPage(store).then(hideLoadingScreen);
    },
    // fetch the facilities if redirecting from /welcome, since the WelcomeModal
    // needs it
    beforeEnter(to, from, next) {
      if (to.redirectedFrom === '/welcome') {
        store.dispatch('getFacilities').then(next, next);
      } else {
        next();
      }
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
    name: PageNames.FACILITIES_PAGE,
    component: withAuthMessage(FacilitiesPage, 'superuser'),
    path: '/facilities',
    handler: ({ name }) => {
      store.dispatch('preparePage', { name, isAsync: false });
    },
  },
  {
    name: PageNames.FACILITIES_TASKS_PAGE,
    component: withAuthMessage(FacilitiesTasksPage, 'superuser'),
    path: '/facilities/tasks',
    handler: ({ name }) => {
      store.dispatch('preparePage', { name, isAsync: false });
    },
  },
  {
    name: PageNames.MANAGE_SYNC_SCHEDULE,
    component: withAuthMessage(ManageSyncSchedule, 'superuser'),
    path: '/facilities/:facilityId/managesync',
    props: route => {
      const { userFacilityId } = useUser();
      const facilityId = route.params.facilityId || get(userFacilityId);
      return {
        goBackRoute: { name: PageNames.FACILITIES_PAGE },
        facilityId,
        editSyncRoute: function (deviceId) {
          return {
            name: PageNames.EDIT_SYNC_SCHEDULE,
            params: {
              device_id: deviceId,
              facilityId: facilityId,
            },
          };
        },
      };
    },
  },
  {
    name: PageNames.EDIT_SYNC_SCHEDULE,
    component: withAuthMessage(EditDeviceSyncSchedule, 'superuser'),
    path: '/facilities/:device_id/:facilityId/editdevice',
    props: route => {
      const { userFacilityId } = useUser();
      return {
        goBackRoute: { name: PageNames.MANAGE_SYNC_SCHEDULE },
        facilityId: route.params.facilityId || get(userFacilityId),
        deviceId: route.params.device_id,
      };
    },
    handler: ({ name }) => {
      store.dispatch('preparePage', { name, isAsync: false });
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
    component: withAuthMessage(DeviceInfoPage, 'superuser'),
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
    handler: ({ name }) => {
      store.dispatch('preparePage', { name });
    },
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
