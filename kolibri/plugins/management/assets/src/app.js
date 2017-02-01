const KolibriModule = require('kolibri.coreModules.kolibriModule');
const coreActions = require('kolibri.coreVue.vuex.actions');
const router = require('kolibri.coreVue.router');

const Vue = require('kolibri.lib.vue');

const RootVue = require('./vue');
const actions = require('./actions');
const store = require('./state/store');
const PageNames = require('./state/constants').PageNames;


class ManagementModule extends KolibriModule {
  ready() {
    const routes = [
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
        name: PageNames.SCRATCHPAD,
        path: '/scratchpad',
        handler: (toRoute, fromRoute) => {
          actions.showScratchpad(store);
        },
      },
      {
        path: '/',
        redirect: '/users',
      },
    ];

    this.rootvue = new Vue({
      el: 'rootvue',
      render: createElement => createElement(RootVue),
      router: router.init(routes),
    });

    coreActions.getCurrentSession(store);
  }
}

module.exports = new ManagementModule();
