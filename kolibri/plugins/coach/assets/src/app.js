const KolibriModule = require('kolibri_module');
const coreActions = require('kolibri.coreVue.vuex.actions');
const router = require('kolibri.coreVue.router');

const Vue = require('kolibri.lib.vue');

const RootVue = require('./views');
const actions = require('./state/actions/main');
const groupActions = require('./state/actions/group');
const examActions = require('./state/actions/exam');
const reportsActions = require('./state/actions/reports');
const store = require('./state/store');
const PageNames = require('./constants').PageNames;

const REPORTS_URL_PATTERN = [
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
          name: PageNames.RECENT,
          path: '/:class_id/recent/:channel_id?',
          handler: (toRoute, fromRoute) => {
            reportsActions.showRecent(
              store,
              toRoute.params.class_id,
              toRoute.params.channel_id
            );
          },
        },
        {
          name: PageNames.TOPICS,
          path: `/:class_id/topics/${REPORTS_URL_PATTERN}`,
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
          name: PageNames.EXAM_REPORT,
          path: '/:classId/exams/:examId',
          handler: (toRoute, fromRoute) => {
            examActions.showExamReportPage(store, toRoute.params.classId, toRoute.params.examId);
          },
        },
        {
          name: PageNames.LEARNERS,
          path: `/:class_id/learners/${REPORTS_URL_PATTERN}`,
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
