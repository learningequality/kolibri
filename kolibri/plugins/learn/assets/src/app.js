const KolibriModule = require('kolibri_module');
const Vue = require('vue');
const VueRouter = require('vue-router');
Vue.use(VueRouter);

class LearnModule extends KolibriModule {
  ready() {
    // attaches the root learn module to the `app-root` tag
    const main = Vue.extend({
      components: {
        'app-root': require('./app-root'),
      },
    });

    this.router = new VueRouter();
    this.router.map({
      '/topics': {
        component: require('./topic-page'),
      },
      '/recommendations': {
        component: require('./recommendations-page'),
      },
      '/content': {
        component: require('./content-page'),
      },
    });

    this.router.start(main, 'body');
  }
}

module.exports = new LearnModule();
