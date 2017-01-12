const KolibriModule = require('kolibri_module');
const router = require('kolibri.coreVue.router');
const coreApp = require('kolibri');
const coreActions = require('kolibri.coreVue.vuex.actions');

const rootvue = require('./vue');
const actions = require('./actions');
const store = require('./state/store');
const PageNames = require('./state/constants').PageNames;

class LearnModule extends KolibriModule {
  ready() {
    router.on(
      PageNames.EXPLORE_ROOT,
      '/explore',
      (toRoute, fromRoute) => {
        actions.redirectToExploreChannel(store);
      }
    );

    router.on(
      PageNames.EXPLORE_CHANNEL,
      '/explore/:channel_id',
      (toRoute, fromRoute) => {
        actions.showExploreChannel(store, toRoute.params.channel_id);
      }
    );

    router.on(
      PageNames.EXPLORE_TOPIC,
      '/explore/:channel_id/topic/:id',
      (toRoute, fromRoute) => {
        actions.showExploreTopic(store, toRoute.params.channel_id, toRoute.params.id);
      }
    );

    router.on(
      PageNames.EXPLORE_CONTENT,
      '/explore/:channel_id/content/:id',
      (toRoute, fromRoute) => {
        actions.showExploreContent(store, toRoute.params.channel_id, toRoute.params.id);
      }
    );

    router.on(
      PageNames.LEARN_ROOT,
      '/learn',
      (toRoute, fromRoute) => {
        actions.redirectToLearnChannel(store);
      }
    );

    router.on(
      PageNames.LEARN_CHANNEL,
      '/learn/:channel_id',
      (toRoute, fromRoute) => {
        const page = toRoute.query.page ? Number(toRoute.query.page) : 1;
        actions.showLearnChannel(store, toRoute.params.channel_id, page);
      }
    );

    router.on(
      PageNames.LEARN_CONTENT,
      '/learn/:channel_id/content/:id',
      (toRoute, fromRoute) => {
        actions.showLearnContent(store, toRoute.params.channel_id, toRoute.params.id);
      }
    );

    router.on(
      PageNames.SCRATCHPAD,
      '/scratchpad',
      (toRoute, fromRoute) => {
        actions.showScratchpad(store);
      }
    );

    router.on(
      PageNames.CONTENT_UNAVAILABLE,
      '/content-unavailable',
      (toRoute, fromRoute) => {
        actions.showContentUnavailable(store);
      }
    );

    router.redirect({
      '/': '/explore',
    });

    router.start(rootvue, 'rootvue');
    coreActions.getCurrentSession(store, coreApp);
    // Wrap this to preserve 'this-ness' inside the router.
    coreApp.on('refresh', () => router.refresh());
  }
}

module.exports = new LearnModule();
