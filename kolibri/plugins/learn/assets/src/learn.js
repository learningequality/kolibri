
const KolibriModule = require('kolibri_module');
const Vue = require('vue');


class LearnModule extends KolibriModule {
  ready() {
    // attaches the root learn module to the `main` tag in
    // the learn.html django template.
    this.vm = new Vue({
      el: 'body',
      components: {
        main: require('./learn-main'),
      },
    });
  },
}

module.exports = new LearnModule();
