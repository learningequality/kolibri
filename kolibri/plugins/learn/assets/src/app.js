const KolibriModule = require('kolibri_module');
const Vue = require('vue');
const VueRouter = require('vue-router');
Vue.use(VueRouter);

class LearnModule extends KolibriModule {
  ready() {
    // attaches the root learn module to the `app-root` tag
    const main = Vue.extend({
      components: {
        vue: require('./vue'),
      },
    });

    this.router = new VueRouter();
    this.router.start(main, 'body');
  }
}

module.exports = new LearnModule();
