const KolibriModule = require('kolibri_module');
const Vue = require('vue');
const VueRouter = require('vue-router');
Vue.use(VueRouter);

class LearnModule extends KolibriModule {
  ready() {
    const Foo = Vue.extend({
      template: '<p>This is foo!</p>',
    });

    const Bar = Vue.extend({
      template: '<p>This is bar!</p>',
    });

    // attaches the root learn module to the `app-root` tag
    const main = Vue.extend({
      components: {
        'app-root': require('./app-root'),
      },
    });

    this.router = new VueRouter();
    this.router.map({
      '/foo': {
        component: Foo,
      },
      '/bar': {
        component: Bar,
      },
    });

    this.router.start(main, 'body');
  }
}

module.exports = new LearnModule();
