const KolibriModule = require('kolibri_module');
const router = require('router');

const rootvue = require('./vue');
const actions = require('./actions');
const store = require('./state/store');
const PageNames = require('./state/constants').PageNames;


class ManagementModule extends KolibriModule {
  ready() {
    router.on(
      PageNames.USER_PAGE,
      '/users',
      (toRoute, fromRoute) => {
        actions.showUserPage(store);
      }
    );

    router.on(
      PageNames.CONTENT_PAGE,
      '/content',
      (toRoute, fromRoute) => {
        actions.showContentPage(store);
      }
    );

    router.on(
      PageNames.DATA_PAGE,
      '/data',
      (toRoute, fromRoute) => {
        actions.showDataPage(store);
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
      '/': '/users',
    });

    router.start(rootvue, 'rootvue');
  }
}

module.exports = new ManagementModule();
