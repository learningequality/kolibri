const KolibriModule = require('kolibri_module');
const coreApp = require('kolibri');
const coreActions = require('kolibri.coreVue.vuex.actions');

const Vue = require('kolibri.lib.vue');

const RootVue = require('./vue');
const router = require('./router');
const store = require('./state/store');

class LearnModule extends KolibriModule {
  ready() {
    this.rootvue = new Vue({
      el: 'rootvue',
      render: h => h(RootVue),
      router,
    });
    coreActions.getCurrentSession(store, coreApp);
  }
}

module.exports = new LearnModule();
