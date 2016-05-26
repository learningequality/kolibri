const KolibriModule = require('kolibri_module');
const Vue = require('vue');

class ManagementModule extends KolibriModule {
  ready() {
    this.vm = new Vue({
      el: 'body',
      components: {
        'app-root': require('./main.vue'),
      },
      store: require('./vuex/store.js').store,
    });
  }
}

module.exports = new ManagementModule();
