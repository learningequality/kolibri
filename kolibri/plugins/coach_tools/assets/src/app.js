const KolibriModule = require('kolibri_module');
const coreApp = require('kolibri');
const coreActions = require('kolibri.coreVue.vuex.actions');
const router = require('kolibri.coreVue.router');

const Vue = require('kolibri.lib.vue');

const RootVue = require('./vue');
const actions = require('./actions');
const store = require('./state/store');
const PageNames = require('./state/constants').PageNames;


const REPORT_URL_PATTERN = [
  '/reports',
  ':channel_id',
  ':content_scope',
  ':content_scope_id',
  ':user_scope',
  ':user_scope_id',
  ':all_or_recent',
  ':view_by_content_or_learners',
  ':sort_column',
  ':sort_order',
].join('/');


class CoachToolsModule extends KolibriModule {
  ready() {
    const routes = [
      {
        name: PageNames.REPORTS_NO_QUERY,
        path: '/reports',
        handler: (toRoute, fromRoute) => {
          actions.redirectToDefaultReport(store, toRoute.params);
        },
      },
      {
        name: PageNames.REPORTS,
        path: REPORT_URL_PATTERN,
        handler: (toRoute, fromRoute) => {
          actions.showReport(store, toRoute.params, fromRoute.params);
        },
      },
      {
        name: PageNames.CONTENT_UNAVAILABLE,
        path: '/content-unavailable',
        handler: (toRoute, fromRoute) => {
          actions.showContentUnavailable(store);
        },
      },
      {
        path: '/',
        redirect: '/reports',
      },
    ];

    this.rootvue = new Vue({
      el: 'rootvue',
      render: createElement => createElement(RootVue),
      router: router.init(routes),
    });

    coreActions.getCurrentSession(store, coreApp);
  }
}

module.exports = new CoachToolsModule();
