import store from 'kolibri.coreVue.vuex.store';
import KolibriApp from 'kolibri_app';

import RootVue from './views';

import { PageNames } from './constants';

import { showClassesPage, showClassEditPage, showClassEnrollPage } from './state/actions/class';
import { showUserPage } from './state/actions/user';
import { showDataPage } from './state/actions/data';
import { showFacilityConfigPage } from './state/actions/facilityConfig';

import * as mutations from './state/mutations';
import initialState from './state/initialState';

const routes = [
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
    name: PageNames.CLASS_ENROLL_MGMT_PAGE,
    path: '/classes/:id/enroll',
    handler: toRoute => {
      showClassEnrollPage(store, toRoute.params.id);
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
    name: PageNames.DATA_EXPORT_PAGE,
    path: '/data',
    handler: () => {
      showDataPage(store);
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

class FacilityManagementModule extends KolibriApp {
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

export default new FacilityManagementModule();
