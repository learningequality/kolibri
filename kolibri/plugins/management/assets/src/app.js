import KolibriApp from 'kolibri_app';
import RootVue from './views';
import * as actions from './state/actions';
import { initialState, mutations } from './state/store';
import { PageNames } from './constants';

class FacilityManagementModule extends KolibriApp {
  get routes() {
    return [
      {
        name: PageNames.CLASS_MGMT_PAGE,
        path: '/classes',
        handler: () => {
          actions.showClassesPage(this.store);
        },
      },
      {
        name: PageNames.CLASS_EDIT_MGMT_PAGE,
        path: '/classes/:id',
        handler: toRoute => {
          actions.showClassEditPage(this.store, toRoute.params.id);
        },
      },
      {
        name: PageNames.CLASS_ENROLL_MGMT_PAGE,
        path: '/classes/:id/enroll',
        handler: toRoute => {
          actions.showClassEnrollPage(this.store, toRoute.params.id);
        },
      },
      {
        name: PageNames.USER_MGMT_PAGE,
        path: '/users',
        handler: () => {
          actions.showUserPage(this.store);
        },
      },
      {
        name: PageNames.DATA_EXPORT_PAGE,
        path: '/data',
        handler: () => {
          actions.showDataPage(this.store);
        },
      },
      {
        name: PageNames.FACILITY_CONFIG_PAGE,
        path: '/configuration',
        handler: () => {
          actions.showFacilityConfigPage(this.store);
        },
      },
      {
        path: '/',
        redirect: '/classes',
      },
    ];
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
