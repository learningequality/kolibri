const KolibriModule = require('kolibri_module');
const coreApp = require('kolibri');
const coreActions = require('kolibri.coreVue.vuex.actions');

const Vue = require('vue');
const VueRouter = require('vue-router');

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
        beforeEnter: (toRoute, fromRoute) => {
          actions.redirectToDefaultReport(store, toRoute.params);
        },
      },
      {
        name: PageNames.REPORTS,
        path: REPORT_URL_PATTERN,
        beforeEnter: (toRoute, fromRoute) => {
          actions.showReport(store, toRoute.params, fromRoute.params);
        },
      },
      {
        path: '/',
        redirect: '/reports',
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

module.exports = new CoachToolsModule();
