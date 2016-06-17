const KolibriModule = require('kolibri_module');
const Vue = require('vue');

class LearnModule extends KolibriModule {
  ready() {
    // attaches the root learn module to the `app-root` tag
    this.vm = new Vue({
      el: 'body',
      components: {
        'app-root': require('./app-root'),
      },
    });
  }
}

module.exports = new LearnModule();
