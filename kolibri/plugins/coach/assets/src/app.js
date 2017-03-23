const KolibriModule = require('kolibri_module');
const coreActions = require('kolibri.coreVue.vuex.actions');
const router = require('kolibri.coreVue.router');

const Vue = require('kolibri.lib.vue');

const RootVue = require('./views');
const actions = require('./state/actions/main');
const groupActions = require('./state/actions/group');
const recentActions = require('./state/actions/recent');
const examActions = require('./state/actions/exam');
const store = require('./state/store');
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
          name: PageNames.CLASS_LIST,
          path: '/',
          handler: (toRoute, fromRoute) => {
            actions.showClassListPage(store);
          },
        },
        {
          name: PageNames.RECENT_CHANNEL_SELECT,
          path: '/:classID',
          handler: (toRoute, fromRoute) => {
            recentActions.showChannelSelect(store, toRoute.params.classID);
          },
        },
        {
          name: PageNames.RECENT,
          path: '/:classID/recent/:channelID',
          handler: (toRoute, fromRoute) => {
            recentActions.showReports(store, toRoute.classID, toRoute.channelID);
          },
        },
        {
          name: PageNames.TOPICS,
          path: REPORTS_URL_PATTERN,
          handler: (toRoute, fromRoute) => {
            actions.showReport(store, toRoute.params);
          },
        },
        {
          name: PageNames.EXAMS,
          path: '/:classId/exams',
          handler: (toRoute, fromRoute) => {
            examActions.showExamsPage(store, toRoute.params.classId);
          },
        },
        {
          name: PageNames.CREATE_EXAM,
          path: '/:classId/exams/new',
          handler: (toRoute, fromRoute) => {
            examActions.showCreateExamPage(store, toRoute.params.classId);
          },
        },
        {
          name: PageNames.LEARNERS,
          path: REPORTS_URL_PATTERN,
          handler: (toRoute, fromRoute) => {
            actions.showReport(store, toRoute.params);
          },
        },
        {
          name: PageNames.GROUPS,
          path: '/:class_id/groups',
          handler: (toRoute, fromRoute) => {
            groupActions.showGroupsPage(store, toRoute.params.class_id);
          },
        },
        {
          name: PageNames.EXERCISE_RENDER,
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
