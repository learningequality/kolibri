const KolibriModule = require('kolibri_module');
const coreActions = require('kolibri.coreVue.vuex.actions');
const router = require('kolibri.coreVue.router');

const Vue = require('kolibri.lib.vue');

const RootVue = require('./views');
const actions = require('./state/actions/main');
const groupActions = require('./state/actions/group');
const reportsActions = require('./state/actions/reports');
const store = require('./state/store');
const PageNames = require('./constants').PageNames;

/*
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
*/

class CoachToolsModule extends KolibriModule {
  ready() {
    const coreStoreUpdates = [
      coreActions.getCurrentSession(store),
      coreActions.setChannelInfo,
    ];
    Promise.all(coreStoreUpdates).then(() => {
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
          // path: `/:class_id/topics/${REPORTS_URL_PATTERN}`,
          path: `/:class_id/topics`,
          handler: (toRoute, fromRoute) => {
            reportsActions.showTopics(store, toRoute.params);
          },
        },
        {
          name: PageNames.EXAMS,
          path: '/:class_id/exams',
          handler: (toRoute, fromRoute) => {
            actions.showExamsPage(store, toRoute.params.class_id);
          },
        },
        {
          name: PageNames.LEARNERS,
          // path: `/:class_id/learners/${REPORTS_URL_PATTERN}`,
          path: `/:class_id/learners`,
          handler: (toRoute, fromRoute) => {
            reportsActions.showLearners(store, toRoute.params);
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
