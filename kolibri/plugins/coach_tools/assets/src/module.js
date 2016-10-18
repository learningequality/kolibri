const Vue = require('vue');
const KolibriModule = require('kolibri_module');

class CoachToolsModule extends KolibriModule {
  /*
   Inherited callback when this module is initialized.
   */
  initialize() {
    console.log('Module is initialized.');
  }

  /*
   Inherited callback when this module is loaded.
   */
  ready() {
    this.vm = new Vue({
      el: 'body',
      components: {
        rootvue: require('./vue'),
      },
    });
  }
}

module.exports = new CoachToolsModule();
