const KolibriModule = require('kolibri_module');
const Vue = require('vue');
const actions = require('./vuex/actions.js');

class ManagementModule extends KolibriModule {
  ready() {
    this.vm = new Vue({
      el: 'body',
      components: {
        'app-root': require('./app-root.vue'),
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
      global.kolibriGlobal.urls.learnergroup_list(),
      global.kolibriGlobal.urls.facilityuser_list(),
      global.kolibriGlobal.urls.membership_list()
    );
  }
}

module.exports = new ManagementModule();
