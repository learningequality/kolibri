const KolibriModule = require('kolibri_module');
const router = require('router');

const rootvue = require('./vue');
const actions = require('./actions');
const store = require('./state/store');
const PageNames = require('./state/constants').PageNames;


class LearnModule extends KolibriModule {
  ready() {
    router.on(
      PageNames.EXPLORE_ROOT,
      `/explore/:channel_id/`,
      (toRoute, fromRoute) => {
        // router.go({
        //   name: '',
        //   params: {},
        //   query: {},
        // });
        actions.showExploreTopic(store, store.state.rootTopicId, store.state.currentChannelId);
      }
    );

    router.on(
      PageNames.EXPLORE_TOPIC,
      `/explore/:channel_id/topic/:id`,
      (toRoute, fromRoute) => {
        actions.showExploreTopic(store, toRoute.params.id, toRoute.params.channel_id);
      }
    );

    router.on(
      PageNames.EXPLORE_CONTENT,
      '/explore/:channel_id/content/:id',
      (toRoute, fromRoute) => {
        actions.showExploreContent(store, toRoute.params.id);
      }
    );

    router.on(
      PageNames.LEARN_ROOT,
      '/learn/:channel_id',
      (toRoute, fromRoute) => {
        actions.showLearnRoot(store);
      }
    );

    router.on(
      PageNames.LEARN_CONTENT,
      '/learn/:channel_id/content/:id',
      (toRoute, fromRoute) => {
        actions.showLearnContent(store, toRoute.params.id);
      }
    );

    router.on(
      PageNames.SCRATCHPAD,
      '/scratchpad',
      (toRoute, fromRoute) => {
        actions.showScratchpad(store);
      }
    );

    router.redirect({
      '/': '/explore',
    });

    router.start(rootvue, 'rootvue');
  }
}

module.exports = new LearnModule();
