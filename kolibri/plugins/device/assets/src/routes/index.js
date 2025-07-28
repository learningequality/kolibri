import store from 'kolibri/store';
import router from 'kolibri/router';
import ManageSyncSchedule from 'kolibri-common/components/SyncSchedule/ManageSyncSchedule';
import EditDeviceSyncSchedule from 'kolibri-common/components/SyncSchedule/EditDeviceSyncSchedule';
import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';
import useFacilities from 'kolibri-common/composables/useFacilities';
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
import UsersRootPage from '../views/lodUsers/UsersRootPage.vue';
import UsersPage from '../views/lodUsers/UsersPage.vue';
import SelectFacilityPage from '../views/lodUsers/importUser/SelectFacilityPage.vue';
import ImportUserAsAdminPage from '../views/lodUsers/importUser/ImportUserAsAdminPage.vue';
import ImportUserWithCredentialsPage from '../views/lodUsers/importUser/ImportUserWithCredentialsPage.vue';
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

function lodGuard(toRoute) {
  const { isLearnerOnlyImport } = useUser();
  if (!get(isLearnerOnlyImport)) {
    return router.replace({
      name: PageNames.MANAGE_CONTENT_PAGE,
    });
  }
  defaultHandler(toRoute);
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
      const { getFacilities } = useFacilities();
      if (to.redirectedFrom === '/welcome') {
        getFacilities().then(next, next);
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
  {
    name: PageNames.USERS_ROOT,
    path: '/users',
    redirect: { name: PageNames.USERS_PAGE },
    component: withAuthMessage(UsersRootPage, 'superuser'),
    props: toRoute => ({
      // There is a bug with the `handler` prop for routes with children and its being ignored,
      // so we are using this `beforeRouteEnter` prop as part of the UserRootPage as
      // a workaround to ensure the `lodGuard` is called, without duplicating this
      // logic (e.g. the "preparePage") inside the UsersRootPage component.
      beforeRouteEnter: () => lodGuard(toRoute),
    }),
    children: [
      {
        name: PageNames.USERS_PAGE,
        path: 'index',
        component: UsersPage,
      },
      {
        path: 'import/select_facility',
        name: PageNames.USERS_SELECT_FACILITY_FOR_IMPORT,
        component: SelectFacilityPage,
      },
      {
        path: 'import/credentials',
        name: PageNames.USERS_IMPORT_USER_WITH_CREDENTIALS,
        component: ImportUserWithCredentialsPage,
      },
      {
        path: 'import/as_admin',
        name: PageNames.USERS_IMPORT_USER_AS_ADMIN,
        component: ImportUserAsAdminPage,
      },
    ],
  },
  ...wizardTransitionRoutes,
  {
    path: '/content/*',
    redirect: '/content',
  },
];

export default routes;
