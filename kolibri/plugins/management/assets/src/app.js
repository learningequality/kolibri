import KolibriApp from 'kolibri_app';
import RootVue from './views';
import * as actions from './state/actions';
import { initialState, mutations } from './state/store';
import { PageNames } from './constants';
import store from 'kolibri.coreVue.vuex.store';

const routes = [
  {
    name: PageNames.CLASS_MGMT_PAGE,
    path: '/classes',
    handler: () => {
      actions.showClassesPage(store);
    },
  },
  {
    name: PageNames.CLASS_EDIT_MGMT_PAGE,
    path: '/classes/:id',
    handler: toRoute => {
      actions.showClassEditPage(store, toRoute.params.id);
    },
  },
  {
    name: PageNames.CLASS_ENROLL_MGMT_PAGE,
    path: '/classes/:id/enroll',
    handler: toRoute => {
      actions.showClassEnrollPage(store, toRoute.params.id);
    },
  },
  {
    name: PageNames.USER_MGMT_PAGE,
    path: '/users',
    handler: () => {
      actions.showUserPage(store);
    },
  },
  {
    name: PageNames.DATA_EXPORT_PAGE,
    path: '/data',
    handler: () => {
      actions.showDataPage(store);
    },
  },
  {
    name: PageNames.FACILITY_CONFIG_PAGE,
    path: '/settings',
    handler: () => {
      actions.showFacilityConfigPage(store);
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
