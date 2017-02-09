const KolibriModule = require('kolibri_module');
const coreActions = require('kolibri.coreVue.vuex.actions');
const router = require('kolibri.coreVue.router');

const Vue = require('kolibri.lib.vue');

const RootVue = require('./vue');
const actions = require('./actions');
const store = require('./state/store');
const PageNames = require('./state/constants').PageNames;


class UserModule extends KolibriModule {
  ready() {
    const routes = [
      {
        name: PageNames.SCRATCHPAD,
        path: '/scratchpad',
        handler: (toRoute, fromRoute) => {
          actions.showScratchpad(store);
        },
      },
      {
        path: '/',
        redirect: '/scratchpad',
      },
    ];

    this.rootvue = new Vue({
      el: 'rootvue',
      render: createElement => createElement(RootVue),
      router: router.init(routes),
    });

    coreActions.getCurrentSession(store);
  }
}

module.exports = new UserModule();
