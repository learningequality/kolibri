import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from './constants';
import {
  showLearnerClassEnrollmentPage,
  showCoachClassAssignmentPage,
} from './modules/classAssignMembers/handlers';
import { showFacilityConfigPage } from './modules/facilityConfig/handlers';
import { showUserPage } from './modules/userManagement/handlers';
import { showClassEditPage } from './modules/classEditManagement/handlers';
import { showClassesPage } from './modules/classManagement/handlers';

export default [
  {
    name: PageNames.CLASS_MGMT_PAGE,
    path: '/classes',
    handler: () => {
      showClassesPage(store);
    },
  },
  {
    name: PageNames.CLASS_EDIT_MGMT_PAGE,
    path: '/classes/:id',
    handler: toRoute => {
      showClassEditPage(store, toRoute.params.id);
    },
  },
  {
    name: PageNames.CLASS_ENROLL_LEARNER,
    path: '/classes/:id/learner-enrollment/',
    handler: toRoute => {
      showLearnerClassEnrollmentPage(store, toRoute.params.id);
    },
  },
  {
    name: PageNames.CLASS_ASSIGN_COACH,
    path: '/classes/:id/coach-assignment/',
    handler: toRoute => {
      showCoachClassAssignmentPage(store, toRoute.params.id);
    },
  },
  {
    name: PageNames.USER_MGMT_PAGE,
    path: '/users',
    handler: () => {
      showUserPage(store);
    },
  },
  {
    name: PageNames.USER_CREATE_PAGE,
    path: '/users/new',
    handler: () => {
      store.dispatch('preparePage', {
        name: PageNames.USER_CREATE_PAGE,
        isAsync: false,
      });
    },
  },
  {
    name: PageNames.USER_EDIT_PAGE,
    path: '/users/:id',
    handler: () => {
      store.dispatch('preparePage', {
        name: PageNames.USER_EDIT_PAGE,
        isAsync: false,
      });
    },
  },
  {
    name: PageNames.DATA_EXPORT_PAGE,
    path: '/data',
    handler: () => {
      store.dispatch('preparePage', {
        name: PageNames.DATA_EXPORT_PAGE,
        isAsync: false,
      });
      store.commit('manageSync/RESET_STATE');
    },
  },
  {
    name: PageNames.FACILITY_CONFIG_PAGE,
    path: '/settings',
    handler: () => {
      showFacilityConfigPage(store);
    },
  },
  {
    path: '/',
    redirect: '/classes',
  },
];
