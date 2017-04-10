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
const ReportConstants = require('./reportConstants');


const REPORTS_URL_PATTERN = [
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
    const coreStoreUpdates = [
      coreActions.getCurrentSession(store),
      coreActions.setChannelInfo(store),
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
            if (toRoute.params.channel_id) {
              reportsActions.showRecentReports(
                store,
                toRoute.params.class_id,
                toRoute.params.channel_id
              );
            } else {
              reportsActions.showRecentChannels(
                store,
                toRoute.params.class_id
              );
            }
          },
        },
        {
          name: PageNames.TOPICS_ROOT,
          path: '/:class_id/topics/:channel_id?',
          handler: (toRoute, fromRoute) => {
            if (toRoute.params.channel_id) {
              reportsActions.redirectToDefaultReport(
                store,
                ReportConstants.ViewBy.CONTENT,
                toRoute.params.class_id,
                toRoute.params.channel_id
              );
            } else {
              console.log('>>>>>> NO CHANNEL');
            }
          },
        },
        {
          name: PageNames.TOPICS,
          path: `/:class_id/topics/${REPORTS_URL_PATTERN}`,
          handler: (toRoute, fromRoute) => {
            const diffKeys = Object.keys(toRoute.params).filter(
              key => toRoute.params[key] !== fromRoute.params[key]
            );
            const localUpdateParams = ['sort_column', 'sort_order'];
            if (diffKeys.every(key => localUpdateParams.includes(key))) {
              reportsActions.updateSorting(
                store,
                toRoute.params.sort_column,
                toRoute.params.sort_order
              );
            } else {
              reportsActions.showReport(store, ReportConstants.ViewBy.CONTENT, toRoute.params);
            }
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
        {
          path: '*',
          redirect: '/',
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
