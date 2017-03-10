const KolibriModule = require('kolibri_module');
const coreActions = require('kolibri.coreVue.vuex.actions');
const router = require('kolibri.coreVue.router');

const Vue = require('kolibri.lib.vue');

const RootVue = require('./vue');
const actions = require('./actions');
const store = require('./state/store');
const PageNames = require('./state/constants').PageNames;


class CoachToolsModule extends KolibriModule {
  ready() {
    coreActions.getCurrentSession(store).then(() => {
      const routes = [
        {
          name: PageNames.COACH_CLASS_LIST_PAGE,
          path: '/classes',
          handler: (toRoute, fromRoute) => {
            actions.showClassListPage(store);
          },
        },
        {
          name: PageNames.COACH_RECENT_PAGE,
          path: '/classes/:id/recent',
          handler: (toRoute, fromRoute) => {
            actions.showRecentPage(store, toRoute.params);
          },
        },
        {
          name: PageNames.COACH_TOPICS_PAGE,
          path: '/classes/:id/topics',
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
          path: '/classes/:id/learners',
          handler: (toRoute, fromRoute) => {
            actions.showLearnersPage(store, toRoute.params);
          },
        },
        {
          name: PageNames.COACH_GROUPS_PAGE,
          path: '/classes/:id/groups',
          handler: (toRoute, fromRoute) => {
            actions.showGroupsPage(store, toRoute.params);
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

module.exports = new CoachToolsModule();
