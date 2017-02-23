const KolibriModule = require('kolibri_module');
const coreActions = require('kolibri.coreVue.vuex.actions');
const router = require('kolibri.coreVue.router');

const Vue = require('kolibri.lib.vue');

const RootVue = require('./vue');
const actions = require('./actions');
const store = require('./state/store');
const PageNames = require('./state/constants').PageNames;

class LearnModule extends KolibriModule {
  ready() {
    coreActions.getCurrentSession(store).then(() => {
      const routes = [
        {
          name: PageNames.EXPLORE_ROOT,
          path: '/topics',
          handler: (toRoute, fromRoute) => {
            actions.redirectToExploreChannel(store);
          },
        },
        {
          name: PageNames.EXPLORE_CHANNEL,
          path: '/topics/:channel_id',
          handler: (toRoute, fromRoute) => {
            actions.showExploreChannel(store, toRoute.params.channel_id);
          },
        },
        {
          name: PageNames.EXPLORE_TOPIC,
          path: '/topics/:channel_id/topic/:id',
          handler: (toRoute, fromRoute) => {
            actions.showExploreTopic(store, toRoute.params.channel_id, toRoute.params.id);
          },
        },
        {
          name: PageNames.EXPLORE_CONTENT,
          path: '/topics/:channel_id/content/:id',
          handler: (toRoute, fromRoute) => {
            actions.showExploreContent(store, toRoute.params.channel_id, toRoute.params.id);
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
          name: PageNames.LEARN_CHANNEL,
          path: '/recommended/:channel_id',
          handler: (toRoute, fromRoute) => {
            const page = toRoute.query.page ? Number(toRoute.query.page) : 1;
            actions.showLearnChannel(store, toRoute.params.channel_id, page);
          },
        },
        {
          name: PageNames.LEARN_CONTENT,
          path: '/recommended/:channel_id/content/:id',
          handler: (toRoute, fromRoute) => {
            actions.showLearnContent(store, toRoute.params.channel_id, toRoute.params.id);
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
          name: PageNames.SEARCH,
          path: '/search/:channel_id/',
          handler: (toRoute, fromRoute) => {
            actions.showSearch(store, toRoute.params.channel_id, toRoute.query.query);
          },
        },
        {
          path: '/',
          redirect: '/recommended',
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
