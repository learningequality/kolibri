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
          handler: (to, from) => {
            actions.showClassListPage(store);
          },
        },
        {
          name: PageNames.RECENT_REPORTS,
          path: '/:class/recent/:channel?/:content?/:user?',
          handler: (to, from) => {
            if (to.params.channel && to.params.content && to.params.user) {
              console.log('RECENT - single user/single item', to.params);
            } else if (to.params.channel && to.params.content) {
              console.log('RECENT - list of users (scope by item)', to.params);
            } else if (to.params.channel) {
              console.log('RECENT - item list (scope by channel)', to.params);
            } else {
              console.log('RECENT - channels', to.params);
              reportsActions.showReportChannels(store, PageNames.RECENT_REPORTS, to.params.class);
            }
          },
        },
        {
          name: PageNames.TOPIC_REPORTS,
          path: '/:class/topics/:channel?/:topic?/:content?/:user?',
          handler: (to, from) => {
            if (to.params.channel && to.params.topic && to.params.content && to.params.user) {
              console.log('TOPICS - single user/single item', to.params);
            } else if (to.params.channel && to.params.topic && to.params.content) {
              console.log('TOPICS - list of users (scope by item)', to.params);
            } else if (to.params.channel && to.params.topic) {
              console.log('TOPICS - sub topic/item lists (scope by topic)', to.params);
            } else if (to.params.channel) {
              console.log('TOPICS - Root topic/item list (scope by root topic)', to.params);
            } else {
              console.log('TOPICS - channels', to.params);
              reportsActions.showReportChannels(store, PageNames.TOPIC_REPORTS, to.params.class);
            }
          },
        },
        {
          name: PageNames.LEARNER_REPORTS,
          path: '/:class/learners/:user?/:channel?/:topic?/:content?',
          handler: (to, from) => {
            if (to.params.user && to.params.channel && to.params.topic && to.params.content) {
              console.log('LEARNERS - single user/single item', to.params);
            } else if (to.params.user && to.params.channel && to.params.topic) {
              console.log('LEARNERS - sub topic/item lists (scope by topic)', to.params);
            } else if (to.params.user && to.params.channel) {
              console.log('LEARNERS - Root topic/item list (scope by root topic)', to.params);
            } else if (to.params.user) {
              console.log('LEARNERS - Channels (scope by user)', to.params);
            } else {
              console.log('LEARNERS - list of users', to.params);
              reportsActions.showReportChannels(store, PageNames.LEARNER_REPORTS, to.params.class);
            }
          },
        },
        {
          name: PageNames.EXAMS,
          path: '/:class/exams',
          handler: (to, from) => {
            actions.showExamsPage(store, to.params.class);
          },
        },
        {
          name: PageNames.GROUPS,
          path: '/:class/groups',
          handler: (to, from) => {
            groupActions.showGroupsPage(store, to.params.class);
          },
        },
        {
          name: PageNames.EXERCISE_RENDER,
          path: '/:user/:content/exercise-render',
          handler: (to, from) => {
            actions.showCoachExerciseRenderPage(store, to.params.user,
              to.params.content);
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
