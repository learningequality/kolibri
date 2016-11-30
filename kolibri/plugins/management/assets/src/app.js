const KolibriModule = require('kolibri_module');
const coreApp = require('kolibri');
const coreActions = require('kolibri.coreVue.vuex.actions');

const Vue = require('vue');
const VueRouter = require('vue-router');

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
        beforeEnter: (toRoute, fromRoute) => {
          actions.showUserPage(store);
        },
      },
      {
        name: PageNames.CONTENT_MGMT_PAGE,
        path: '/content',
        beforeEnter: (toRoute, fromRoute) => {
          actions.showContentPage(store);
        },
      },
      {
        name: PageNames.DATA_EXPORT_PAGE,
        path: '/data',
        beforeEnter: (toRoute, fromRoute) => {
          actions.showDataPage(store);
        },
      },
      {
        name: PageNames.SCRATCHPAD,
        path: '/scratchpad',
        beforeEnter: (toRoute, fromRoute) => {
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
      render: h => h(RootVue),
      router: new VueRouter({ routes }),
    });

    coreActions.getCurrentSession(store, coreApp);
  }
}

module.exports = new ManagementModule();
