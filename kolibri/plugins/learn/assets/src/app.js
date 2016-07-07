const KolibriModule = require('kolibri_module');
const rootvue = require('./vue');
const router = require('./router');
const Kolibri = require('kolibri');

const actions = require('./actions');
const PageNames = require('./constants').PageNames;


class LearnModule extends KolibriModule {
  initialize() {
    Kolibri.resources.ContentNodeResource.setChannel('dummy_db');
  }
  ready() {
    router.on(
      PageNames.EXPLORE_ROOT,
      '/explore',
      actions.navToExploreRoot
    );

    router.on(
      PageNames.EXPLORE_TOPIC,
      '/explore/topic/:content_id',
      actions.temp
    );

    router.on(
      PageNames.EXPLORE_CONTENT,
      '/explore/content/:content_id',
      actions.temp
    );

    router.on(
      PageNames.LEARN_ROOT,
      '/learn',
      actions.navToLearnRoot
    );

    router.on(
      PageNames.SCRATCHPAD,
      '/scratchpad',
      actions.temp
    );

    router.redirect({
      '/': '/explore',
    });

    router.start(rootvue, 'rootvue');
  }
}

module.exports = new LearnModule();
