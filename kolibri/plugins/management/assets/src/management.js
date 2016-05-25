const KolibriModule = require('kolibri_module');
const Vue = require('vue');
const actions = require('./vuex/actions.js');

class ManagementModule extends KolibriModule {
  ready() {
    this.vm = new Vue({
      el: 'body',
      components: {
        main: require('./main.vue'),
      },
      store: require('./vuex/store.js').store,
      vuex: {
        actions: {
          fetch: actions.fetch,
        },
      },
    });
    this.vm.fetch(
      global.kolibriGlobal.urls.classroom_list(),
      global.kolibriGlobal.urls.learnergroup_list()
    );
  }
}

module.exports = new ManagementModule();
