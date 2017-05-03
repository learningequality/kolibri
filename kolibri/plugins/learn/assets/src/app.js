const KolibriModule = require('kolibri_module');
const coreActions = require('kolibri.coreVue.vuex.actions');
const router = require('kolibri.coreVue.router');

const Vue = require('kolibri.lib.vue');

const RootVue = require('./views');
const actions = require('./state/actions');
const store = require('./state/store');
const PageNames = require('./constants').PageNames;

class LearnModule extends KolibriModule {
  ready() {
    actions.prepareLearnApp(store)
    .then(() => coreActions.getCurrentSession(store))
    .then(() => {
      const routes = [
        {
          path: '/',
          redirect: '/recommended',
        },
        {
          name: PageNames.EXPLORE_ROOT,
          path: '/topics',
          handler: (toRoute, fromRoute) => {
            actions.redirectToExploreChannel(store);
          },
        },
        {
          name: PageNames.LEARN_ROOT,
          path: '/recommended',
          handler: (toRoute, fromRoute) => {
            actions.redirectToLearnChannel(store);
          },
        },
        {
          name: PageNames.SEARCH_ROOT,
          path: '/search',
          handler: (toRoute, fromRoute) => {
            actions.redirectToChannelSearch(store);
          },
        },
        {
          name: PageNames.SCRATCHPAD,
          path: '/scratchpad',
          handler: (toRoute, fromRoute) => {
            actions.showScratchpad(store);
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
          name: PageNames.EXPLORE_CHANNEL,
          path: '/:channel_id/topics',
          handler: (toRoute, fromRoute) => {
            actions.showExploreChannel(store, toRoute.params.channel_id);
          },
        },
        {
          name: PageNames.EXPLORE_TOPIC,
          path: '/:channel_id/topics/t/:id',
          handler: (toRoute, fromRoute) => {
            actions.showExploreTopic(store, toRoute.params.channel_id, toRoute.params.id);
          },
        },
        {
          name: PageNames.EXPLORE_CONTENT,
          path: '/:channel_id/topics/c/:id',
          handler: (toRoute, fromRoute) => {
            actions.showExploreContent(store, toRoute.params.channel_id, toRoute.params.id);
          },
        },
        {
          name: PageNames.LEARN_CHANNEL,
          path: '/:channel_id/recommended',
          handler: (toRoute, fromRoute) => {
            const page = toRoute.query.page ? Number(toRoute.query.page) : 1;
            actions.showLearnChannel(store, toRoute.params.channel_id, page);
          },
        },
        {
          name: PageNames.LEARN_CONTENT,
          path: '/:channel_id/recommended/:id',
          handler: (toRoute, fromRoute) => {
            actions.showLearnContent(store, toRoute.params.channel_id, toRoute.params.id);
          },
        },
        {
          name: PageNames.SEARCH,
          path: '/:channel_id/search',
          handler: (toRoute, fromRoute) => {
            actions.showSearch(store, toRoute.params.channel_id, toRoute.query.query);
          },
        },
        {
          name: PageNames.EXAM_LIST,
          path: '/:channel_id/exams',
          handler: (toRoute, fromRoute) => {
            actions.showExamList(store, toRoute.params.channel_id);
          },
        },
        {
          name: PageNames.EXAM,
          path: '/:channel_id/exams/:id/:questionNumber',
          handler: (toRoute, fromRoute) => {
            actions.showExam(store, toRoute.params.channel_id, toRoute.params.id,
              toRoute.params.questionNumber);
          },
        },
        {
          name: PageNames.EXAM_ROOT,
          path: '/:channel_id/exams/:id',
          redirect: '/:channel_id/exams/:id/0',
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

module.exports = new LearnModule();
