const KolibriModule = require('kolibri_module');
const router = require('kolibri.coreVue.router');
const kolibri = require('kolibri');
const coreActions = require('kolibri.coreVue.vuex.actions');

const rootvue = require('./vue');
const actions = require('./actions');
const store = require('./state/store');
const PageNames = require('./state/constants').PageNames;


class ManagementModule extends KolibriModule {
  ready() {
    router.on(
      PageNames.USER_MGMT_PAGE,
      '/users',
      (toRoute, fromRoute) => {
        actions.showUserPage(store);
      }
    );

    router.on(
      PageNames.CONTENT_MGMT_PAGE,
      '/content',
      (toRoute, fromRoute) => {
        actions.showContentPage(store);
      }
    );

    router.on(
      PageNames.DATA_EXPORT_PAGE,
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
    coreActions.currentLoggedInUser(store, kolibri);
  }
}

module.exports = new ManagementModule();
