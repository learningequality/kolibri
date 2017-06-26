import KolibriModule from 'kolibri_module';
import coreActions from 'kolibri.coreVue.vuex.actions';
import router from 'kolibri.coreVue.router';

import Vue from 'kolibri.lib.vue';

import RootVue from './views';
import * as actions from './state/actions';
import store from './state/store';
import { PageNames } from './constants';


class ManagementModule extends KolibriModule {
  ready() {
    coreActions.getCurrentSession(store).then(() => {
      const routes = [
        {
          name: PageNames.CLASS_MGMT_PAGE,
          path: '/classes',
          handler: (toRoute, fromRoute) => {
            actions.showClassesPage(store);
          },
        },
        {
          name: PageNames.CLASS_EDIT_MGMT_PAGE,
          path: '/classes/:id',
          handler: (toRoute, fromRoute) => {
            actions.showClassEditPage(store, toRoute.params.id);
          },
        },
        {
          name: PageNames.CLASS_ENROLL_MGMT_PAGE,
          path: '/classes/:id/enroll',
          handler: (toRoute, fromRoute) => {
            actions.showClassEnrollPage(store, toRoute.params.id);
          },
        },
        {
          name: PageNames.USER_MGMT_PAGE,
          path: '/users',
          handler: (toRoute, fromRoute) => {
            actions.showUserPage(store);
          },
        },
        {
          name: PageNames.CONTENT_MGMT_PAGE,
          path: '/content',
          handler: (toRoute, fromRoute) => {
            actions.showContentPage(store);
          },
        },
        {
          name: PageNames.DATA_EXPORT_PAGE,
          path: '/data',
          handler: (toRoute, fromRoute) => {
            actions.showDataPage(store);
          },
        },
        {
          name: PageNames.FACILITY_CONFIG_PAGE,
          path: '/facilities',
          handler: (toRoute, fromRoute) => {
            actions.showFacilityConfigPage(store);
          },
        },
        {
          name: PageNames.SCRATCHPAD,
          path: '/scratchpad',
          handler: (toRoute, fromRoute) => {
            actions.showScratchpad(store);
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

const managementModule = new ManagementModule();

export { managementModule as default };
