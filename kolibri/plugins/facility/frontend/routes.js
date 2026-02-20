import store from 'kolibri/store';
import ManageSyncSchedule from 'kolibri-common/components/SyncSchedule/ManageSyncSchedule';
import EditDeviceSyncSchedule from 'kolibri-common/components/SyncSchedule/EditDeviceSyncSchedule';
import { SyncPageNames } from 'kolibri-common/components/SyncSchedule/constants';
import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';
import useFacilities from 'kolibri-common/composables/useFacilities';
import ClassEditPage from './views/ClassEditPage';
import CoachClassAssignmentPage from './views/CoachClassAssignmentPage';
import LearnerClassEnrollmentPage from './views/LearnerClassEnrollmentPage';
import DataPage from './views/DataPage';
import ImportCsvPage from './views/ImportCsvPage';
import FacilityConfigPage from './views/FacilityConfigPage';
import ManageClassPage from './views/ManageClassPage';
import UsersRootPage from './views/users/UsersRootPage';
import NewUsersPage from './views/users/NewUsersPage.vue';
import UserEditPage from './views/UserEditPage';
import AllFacilitiesPage from './views/AllFacilitiesPage';
import UsersTrashPage from './views/users/UsersTrashPage/index.vue';

import { showClassesPage } from './modules/classManagement/handlers';
import { showClassEditPage } from './modules/classEditManagement/handlers';
import { showFacilityConfigPage } from './modules/facilityConfig/handlers';
import {
  showLearnerClassEnrollmentPage,
  showCoachClassAssignmentPage,
} from './modules/classAssignMembers/handlers';
import { facilityParamRequiredGuard, getSidePanelRoutes } from './utils';
import { PageNames } from './constants';

export default [
  // Routes for multi-facility case
  {
    name: PageNames.ALL_FACILITIES_PAGE,
    path: '/:subtopicName?/facilities',
    component: AllFacilitiesPage,
    props: true,
    handler() {
      store.dispatch('preparePage', { isAsync: false });
    },
  },
  // In the multi-facility case, the optional facility_id needs to be provided.
  // If it's missing, then we are likely in single-facility situation and we use
  // the facility ID set during login as the default.
  {
    name: PageNames.CLASS_MGMT_PAGE,
    path: '/:facility_id?/classes',
    component: ManageClassPage,
    handler: toRoute => {
      if (facilityParamRequiredGuard(toRoute, ManageClassPage.name)) {
        return;
      }
      showClassesPage(store, toRoute);
    },
  },
  {
    name: PageNames.CLASS_EDIT_MGMT_PAGE,
    path: '/:facility_id?/classes/:id',
    component: ClassEditPage,
    handler: toRoute => {
      showClassEditPage(store, toRoute.params.id);
    },
  },
  {
    name: PageNames.CLASS_ENROLL_LEARNER,
    component: LearnerClassEnrollmentPage,
    path: '/:facility_id?/classes/:id/learner-enrollment/',
    handler: (toRoute, fromRoute) => {
      showLearnerClassEnrollmentPage(store, toRoute, fromRoute);
    },
  },
  {
    name: PageNames.CLASS_ASSIGN_COACH,
    component: CoachClassAssignmentPage,
    path: '/:facility_id?/classes/:id/coach-assignment/',
    handler: (toRoute, fromRoute) => {
      showCoachClassAssignmentPage(store, toRoute, fromRoute);
    },
  },
  {
    name: PageNames.USER_MGMT_PAGE,
    component: UsersRootPage,
    path: '/:facility_id?/users/',
    handler: toRoute => {
      if (facilityParamRequiredGuard(toRoute, UsersRootPage.name)) {
        return;
      }
    },
    children: getSidePanelRoutes([
      PageNames.FILTER_USERS_SIDE_PANEL,
      PageNames.ASSIGN_COACHES_SIDE_PANEL,
      PageNames.REMOVE_FROM_CLASSES_SIDE_PANEL,
      PageNames.ENROLL_LEARNERS_SIDE_PANEL,
    ]),
  },
  {
    name: PageNames.NEW_USERS_PAGE,
    component: NewUsersPage,
    path: '/:facility_id?/users/new-users',
    handler: toRoute => {
      if (facilityParamRequiredGuard(toRoute, NewUsersPage.name)) {
        return;
      }
    },
    children: getSidePanelRoutes(
      [
        PageNames.FILTER_USERS_SIDE_PANEL,
        PageNames.ASSIGN_COACHES_SIDE_PANEL,
        PageNames.REMOVE_FROM_CLASSES_SIDE_PANEL,
        PageNames.ENROLL_LEARNERS_SIDE_PANEL,
        PageNames.ADD_NEW_USER_SIDE_PANEL,
      ],
      'NEW_USERS',
    ),
  },
  {
    name: PageNames.USERS_TRASH_PAGE,
    component: UsersTrashPage,
    path: '/:facility_id?/users/deleted',
    handler: toRoute => {
      if (facilityParamRequiredGuard(toRoute, UsersTrashPage.name)) {
        return;
      }
    },
    children: getSidePanelRoutes([PageNames.FILTER_USERS_SIDE_PANEL], 'TRASH'),
  },
  {
    name: PageNames.USER_EDIT_PAGE,
    component: UserEditPage,
    path: '/:facility_id?/users/:id',
    handler: () => {
      store.dispatch('preparePage', { isAsync: false });
    },
  },
  {
    name: PageNames.DATA_EXPORT_PAGE,
    component: DataPage,
    path: '/:facility_id?/data',
    handler: toRoute => {
      if (facilityParamRequiredGuard(toRoute, DataPage.name)) {
        return;
      }
      store.dispatch('preparePage', { isAsync: false });
    },
  },
  {
    name: PageNames.IMPORT_CSV_PAGE,
    component: ImportCsvPage,
    path: '/:facility_id?/data/import',
    handler: () => {
      store.dispatch('preparePage', { isAsync: false });
    },
  },
  {
    name: PageNames.FACILITY_CONFIG_PAGE,
    component: FacilityConfigPage,
    path: '/:facility_id?/settings',
    handler: toRoute => {
      if (facilityParamRequiredGuard(toRoute, FacilityConfigPage.name)) {
        return;
      }
      showFacilityConfigPage(store, toRoute);
    },
  },
  {
    path: '/',
    // Redirect to AllFacilitiesPage if a superuser and device has > 1 facility
    beforeEnter(to, from, next) {
      const { userIsMultiFacilityAdmin } = useFacilities();
      if (userIsMultiFacilityAdmin.value) {
        next(store.getters.facilityPageLinks.AllFacilitiesPage);
      } else {
        next(store.getters.facilityPageLinks.ManageClassPage);
      }
    },
  },
  {
    path: '/:facility_id?/managesync',
    props: route => {
      const { userFacilityId } = useUser();
      const facilityId = route.params.facility_id || get(userFacilityId);
      return {
        facilityId,
        goBackRoute: {
          name: PageNames.DATA_EXPORT_PAGE,
          params: { facility_id: route.params.facility_id },
        },
        editSyncRoute: function (deviceId) {
          return {
            name: SyncPageNames.EDIT_SYNC_SCHEDULE,
            params: {
              deviceId,
              facility_id: facilityId,
            },
          };
        },
      };
    },
    component: ManageSyncSchedule,
    name: SyncPageNames.MANAGE_SYNC_SCHEDULE,
  },
  {
    path: '/:facility_id?/editdevice/:deviceId/',
    component: EditDeviceSyncSchedule,
    name: SyncPageNames.EDIT_SYNC_SCHEDULE,
    props: route => {
      const { userFacilityId } = useUser();
      return {
        facilityId: route.params.facility_id || get(userFacilityId),
        deviceId: route.params.deviceId,
        goBackRoute: {
          name: SyncPageNames.MANAGE_SYNC_SCHEDULE,
          params: { facility_id: route.params.facility_id },
        },
      };
    },
  },
];
