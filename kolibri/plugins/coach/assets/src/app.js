const KolibriModule = require('kolibri_module');
const coreActions = require('kolibri.coreVue.vuex.actions');
const router = require('kolibri.coreVue.router');

const Vue = require('kolibri.lib.vue');

const RootVue = require('./vue');
const actions = require('./vuex/actions/main');
const groupActions = require('./vuex/actions/group');
const recentActions = require('./vuex/actions/recent');
const store = require('./vuex/store');
const PageNames = require('./constants').PageNames;

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
          name: PageNames.COACH_RECENT_PAGE_CHANNEL_SELECT,
          path: '/:classID',
          handler: (toRoute, fromRoute) => {
            recentActions.showChannelSelect(store, toRoute.params.classID);
          },
        },
        {
          name: PageNames.COACH_RECENT_PAGE,
          path: '/:classID/:channelID',
          handler: (toRoute, fromRoute) => {
            recentActions.showReports(store, toRoute.classID, toRoute.channelID);
          },
        },
        {
          name: PageNames.COACH_TOPICS_PAGE,
          path: REPORTS_URL_PATTERN,
          handler: (toRoute, fromRoute) => {
            actions.showReport(store, toRoute.params);
          },
        },
        {
          name: PageNames.COACH_EXAMS_PAGE,
          path: '/:class_id/exams',
          handler: (toRoute, fromRoute) => {
            actions.showExamsPage(store, toRoute.params);
          },
        },
        {
          name: PageNames.COACH_LEARNERS_PAGE,
          path: REPORTS_URL_PATTERN,
          handler: (toRoute, fromRoute) => {
            actions.showReport(store, toRoute.params);
          },
        },
        {
          name: PageNames.COACH_GROUPS_PAGE,
          path: '/:class_id/groups',
          handler: (toRoute, fromRoute) => {
            groupActions.showGroupsPage(store, toRoute.params.class_id);
          },
        },
        {
          name: PageNames.COACH_EXERCISE_RENDER_PAGE,
          path: '/:user_id/:content_id/exercise-render',
          handler: (toRoute, fromRoute) => {
            actions.showCoachExerciseRenderPage(store, toRoute.params.user_id,
              toRoute.params.content_id);
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
