const KolibriModule = require('kolibri_module');
const router = require('kolibri/coreVue/router');
const kolibri = require('kolibri');
const coreActions = require('kolibri/coreVue/vuex/actions');

const rootvue = require('./vue');
const actions = require('./actions');
const store = require('./state/store');

class CoachToolsModule extends KolibriModule {
  ready() {
    router.on(
      'HOME',
      '/',
      (toRoute, fromRoute) => {
        actions.initializePage(store);
      }
    );

    router.on(
      'SCRATCHPAD',
      '/scratchpad',
      (toRoute, fromRoute) => {
        actions.showScratchpad(store);
      }
    );

    router.start(rootvue, 'rootvue');
    coreActions.currentLoggedInUser(store, kolibri);
  }
}

module.exports = new CoachToolsModule();
