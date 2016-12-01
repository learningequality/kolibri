const KolibriModule = require('kolibri_module');
const coreApp = require('kolibri');
const coreActions = require('kolibri.coreVue.vuex.actions');

const Vue = require('kolibri.lib.vue');
const VueRouter = require('kolibri.lib.vueRouter');

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
        beforeEnter: (toRoute, fromRoute) => {
          actions.redirectToExploreChannel(store);
        },
      },
      {
        name: PageNames.EXPLORE_CHANNEL,
        path: '/explore/:channel_id',
        beforeEnter: (toRoute, fromRoute) => {
          actions.showExploreChannel(store, toRoute.params.channel_id);
        },
      },
      {
        name: PageNames.EXPLORE_TOPIC,
        path: '/explore/:channel_id/topic/:id',
        beforeEnter: (toRoute, fromRoute) => {
          actions.showExploreTopic(store, toRoute.params.channel_id, toRoute.params.id);
        },
      },
      {
        name: PageNames.EXPLORE_CONTENT,
        path: '/explore/:channel_id/content/:id',
        beforeEnter: (toRoute, fromRoute) => {
          actions.showExploreContent(store, toRoute.params.channel_id, toRoute.params.id);
        },
      },
      {
        name: PageNames.LEARN_ROOT,
        path: '/learn',
        beforeEnter: (toRoute, fromRoute) => {
          actions.redirectToLearnChannel(store);
        },
      },
      {
        name: PageNames.LEARN_CHANNEL,
        path: '/learn/:channel_id',
        beforeEnter: (toRoute, fromRoute) => {
          const page = toRoute.query.page ? Number(toRoute.query.page) : 1;
          actions.showLearnChannel(store, toRoute.params.channel_id, page);
        },
      },
      {
        name: PageNames.LEARN_CONTENT,
        path: '/learn/:channel_id/content/:id',
        beforeEnter: (toRoute, fromRoute) => {
          actions.showLearnContent(store, toRoute.params.channel_id, toRoute.params.id);
        },
      },
      {
        name: PageNames.SCRATCHPAD,
        path: '/scratchpad',
        beforeEnter: (toRoute, fromRoute) => {
          actions.showScratchpad(store);
        },
      },
      {
        name: PageNames.CONTENT_UNAVAILABLE,
        path: '/content-unavailable',
        beforeEnter: (toRoute, fromRoute) => {
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
      render: h => h(RootVue),
      router: new VueRouter({ routes }),
    });

    coreActions.getCurrentSession(store, coreApp);
  }
}

module.exports = new LearnModule();
