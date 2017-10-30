import KolibriModule from 'kolibri_module';
import * as coreActions from 'kolibri.coreVue.vuex.actions';
import router from 'kolibri.coreVue.router';
import Vue from 'kolibri.lib.vue';
import RootVue from './views';
import * as actions from './state/actions';
import store from './state/store';
import { PageNames } from './constants';

class FacilityManagementModule extends KolibriModule {
  ready() {
    coreActions.getCurrentSession(store).then(() => {
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
          path: '/configuration',
          handler: () => {
            actions.showFacilityConfigPage(store);
          },
        },
        {
          path: '/',
          redirect: '/classes',
        },
      ];

      this.rootvue = new Vue({
        el: 'rootvue',
        render: createElement => createElement(RootVue),
        router: router.init(routes),
      });
    });
  }
}

export default new FacilityManagementModule();
