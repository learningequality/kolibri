const KolibriModule = require('kolibri_module');
const coreActions = require('kolibri.coreVue.vuex.actions');
const router = require('kolibri.coreVue.router');

const Vue = require('kolibri.lib.vue');

const RootVue = require('./vue');
const actions = require('./actions');
const store = require('./state/store');
const PageNames = require('./state/constants').PageNames;

const RECENT_URL_PATTERN = [
  ':class_id',
  '/recent',
  ':channel_id'
].join('/');


const REPORTS_URL_PATTERN = [
  ':class_id',
  ':view_by_content_or_learners',
  ':channel_id',
  ':content_scope',
  ':content_scope_id',
  ':user_scope',
  ':user_scope_id',
  ':sort_column',
  ':sort_order',
].join('/');

// const REPORT_URL_PATTERN = [
//   '/reports',
//   ':channel_id',
//   ':content_scope',
//   ':content_scope_id',
//   ':user_scope',
//   ':user_scope_id',
//   ':all_or_recent',
//   ':view_by_content_or_learners',
//   ':sort_column',
//   ':sort_order',
// ].join('/');


class CoachToolsModule extends KolibriModule {
  ready() {
    coreActions.getCurrentSession(store).then(() => {
      const routes = [
        {
          name: PageNames.COACH_CLASS_LIST_PAGE,
          path: '/',
          handler: (toRoute, fromRoute) => {
            actions.showClassListPage(store);
          },
        },
        {
          name: PageNames.COACH_RECENT_PAGE,
          path: RECENT_URL_PATTERN,
          handler: (toRoute, fromRoute) => {
            actions.showRecentPage(store, toRoute.params);
          },
        },
        {
          name: PageNames.COACH_TOPICS_PAGE,
          path: REPORTS_URL_PATTERN,
          handler: (toRoute, fromRoute) => {
            actions.showTopicsPage(store, toRoute.params);
          },
        },
        {
          name: PageNames.COACH_EXAMS_PAGE,
          path: '/classes/:id/exams',
          handler: (toRoute, fromRoute) => {
            actions.showExamsPage(store, toRoute.params);
          },
        },
        {
          name: PageNames.COACH_LEARNERS_PAGE,
          path: REPORTS_URL_PATTERN,
          handler: (toRoute, fromRoute) => {
            actions.showLearnersPage(store, toRoute.params);
          },
        },
        {
          name: PageNames.COACH_GROUPS_PAGE,
          path: '/classes/:id/groups',
          handler: (toRoute, fromRoute) => {
            actions.showGroupsPage(store, toRoute.params.id);
          },
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

module.exports = new CoachToolsModule();
