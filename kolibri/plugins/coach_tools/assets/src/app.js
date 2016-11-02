const KolibriModule = require('kolibri_module');
const router = require('kolibri.coreVue.router');
const kolibri = require('kolibri');
const coreActions = require('kolibri.coreVue.vuex.actions');

const rootvue = require('./vue');
const actions = require('./actions');
const store = require('./state/store');
const PageNames = require('./state/constants').PageNames;

class CoachToolsModule extends KolibriModule {
  ready() {
    router.on(
      PageNames.COACH_ROOT,
      '/',
      (toRoute, fromRoute) => {
        actions.showCoachRoot(store);
      }
    );

    router.on(
      PageNames.REPORTS_NO_QUERY,
      '/reports',
      (toRoute, fromRoute) => {
        actions.redirectToDefaultReports(store, toRoute.params);
      }
    );

    router.on(
      PageNames.REPORTS,
      // eslint-disable-next-line
      '/reports/:channel_id/:content_scope/:content_scope_id/:user_scope/:user_scope_id/:all_or_recent/:view_by_content_or_learners',
      (toRoute, fromRoute) => {
        actions.showReports(store, toRoute.params);
      }
    );

    router.start(rootvue, 'rootvue');
    coreActions.currentLoggedInUser(store, kolibri);
  }
}

module.exports = new CoachToolsModule();
