const KolibriModule = require('kolibri_module');
const coreApp = require('kolibri');
const coreActions = require('kolibri.coreVue.vuex.actions');
const router = require('kolibri.coreVue.router');

const Vue = require('kolibri.lib.vue');

const RootVue = require('./vue');
const actions = require('./actions');
const store = require('./state/store');
const PageNames = require('./state/constants').PageNames;

class LearnModule extends KolibriModule {
  ready() {

    const routes = [
      {
        name: PageNames.EXPLORE_ROOT,
        path: '/explore',
        handler: (toRoute, fromRoute) => {
          actions.redirectToExploreChannel(store);
        },
      },
      {
        name: PageNames.EXPLORE_CHANNEL,
        path: '/explore/:channel_id',
        handler: (toRoute, fromRoute) => {
          actions.showExploreChannel(store, toRoute.params.channel_id);
        },
      },
      {
        name: PageNames.EXPLORE_TOPIC,
        path: '/explore/:channel_id/topic/:id',
        handler: (toRoute, fromRoute) => {
          actions.showExploreTopic(store, toRoute.params.channel_id, toRoute.params.id);
        },
      },
      {
        name: PageNames.EXPLORE_CONTENT,
        path: '/explore/:channel_id/content/:id',
        handler: (toRoute, fromRoute) => {
          actions.showExploreContent(store, toRoute.params.channel_id, toRoute.params.id);
        },
      },
      {
        name: PageNames.LEARN_ROOT,
        path: '/learn',
        handler: (toRoute, fromRoute) => {
          actions.redirectToLearnChannel(store);
        },
      },
      {
        name: PageNames.LEARN_CHANNEL,
        path: '/learn/:channel_id',
        handler: (toRoute, fromRoute) => {
          const page = toRoute.query.page ? Number(toRoute.query.page) : 1;
          actions.showLearnChannel(store, toRoute.params.channel_id, page);
        },
      },
      {
        name: PageNames.LEARN_CONTENT,
        path: '/learn/:channel_id/content/:id',
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
        path: '/',
        redirect: '/explore',
      },
    ];

    this.rootvue = new Vue({
      el: 'rootvue',
      render: createElement => createElement(RootVue),
      router: router.init(routes),
    });

    coreActions.getCurrentSession(store, coreApp);
  }
}

module.exports = new LearnModule();
