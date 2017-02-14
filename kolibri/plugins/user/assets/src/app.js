const KolibriModule = require('kolibri_module');
const coreActions = require('kolibri.coreVue.vuex.actions');
const router = require('kolibri.coreVue.router');

const Vue = require('kolibri.lib.vue');

const RootVue = require('./vue');
const actions = require('./actions');
const store = require('./state/store');
const PageNames = require('./state/constants').PageNames;


class UserModule extends KolibriModule {
  ready() {
    coreActions.getCurrentSession(store).then(() => {
      const routes = [
        {
          name: PageNames.ROOT,
          path: '/',
          handler: (toRoute, fromRoute) => {
            actions.showRoot(store);
          },
        },
        {
          name: PageNames.SIGN_IN,
          path: '/signin',
          handler: (toRoute, fromRoute) => {
            actions.showSignIn(store);
          },
        },
        {
          name: PageNames.SIGN_UP,
          path: '/signup',
          handler: (toRoute, fromRoute) => {
            actions.showSignUp(store);
          },
        },
        {
          name: PageNames.PROFILE,
          path: '/profile',
          handler: (toRoute, fromRoute) => {
            actions.showProfile(store);
          },
        },
        {
          path: '*',
          redirect: '/',
        },
      ];

      this.rootvue = new Vue({
        el: 'rootvue',
        render: createElement => createElement(RootVue),
        router: router.init(routes),
      });
    });
  }
}

module.exports = new UserModule();
