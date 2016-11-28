const KolibriModule = require('kolibri_module');
const coreApp = require('kolibri');
const router = require('kolibri.coreVue.router');
const coreActions = require('kolibri.coreVue.vuex.actions');

const rootvue = require('./vue');
const actions = require('./actions');
const store = require('./state/store');
const PageNames = require('./state/constants').PageNames;


const REPORT_URL_PATTERN = [
  '/reports',
  ':channel_id',
  ':content_scope',
  ':content_scope_id',
  ':user_scope',
  ':user_scope_id',
  ':all_or_recent',
  ':view_by_content_or_learners',
  ':sort_column',
  ':sort_order',
].join('/');


class CoachToolsModule extends KolibriModule {
  mounted() {
    router.redirect({
      '/': '/reports',
    });
    router.on(
      PageNames.REPORTS_NO_QUERY,
      '/reports',
      (toRoute, fromRoute) => {
        actions.redirectToDefaultReport(store, toRoute.params);
      }
    );
    router.on(
      PageNames.REPORTS,
      REPORT_URL_PATTERN,
      (toRoute, fromRoute) => {
        actions.showReport(store, toRoute.params, fromRoute.params);
      }
    );
    router.start(rootvue, 'rootvue');
    coreActions.getCurrentSession(store, coreApp);
  }
}

module.exports = new CoachToolsModule();
