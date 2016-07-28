const KolibriModule = require('kolibri_module');
const Vue = require('vue');
const actions = require('./actions.js');

class ManagementModule extends KolibriModule {
  ready() {
    this.vm = new Vue({
      el: 'body',
      components: {
        rootvue: require('./vue'),
      },
      store: require('./state/store.js').store,
      vuex: {
        actions: {
          fetch: actions.fetch,
        },
      },
    });
    this.vm.fetch();
  }
}

module.exports = new ManagementModule();
