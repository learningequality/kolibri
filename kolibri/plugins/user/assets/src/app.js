import KolibriModule from 'kolibri_module';
import * as coreActions from 'kolibri.coreVue.vuex.actions';
import router from 'kolibri.coreVue.router';

import Vue from 'kolibri.lib.vue';

import RootVue from './views';
import * as actions from './state/actions';
import store from './state/store';
import { PageNames } from './constants';

class UserModule extends KolibriModule {
  ready() {
    coreActions
      .getCurrentSession(store)
      .then(() => coreActions.getFacilityConfig(store))
      .then(() => {
        const routes = [
          {
            name: PageNames.ROOT,
            path: '/',
            handler: () => {
              actions.showRoot(store);
            },
          },
          {
            name: PageNames.SIGN_IN,
            path: '/signin',
            handler: () => {
              actions.showSignIn(store);
            },
          },
          {
            name: PageNames.SIGN_UP,
            path: '/create_account',
            handler: () => {
              actions.showSignUp(store);
            },
          },
          {
            name: PageNames.PROFILE,
            path: '/profile',
            handler: () => {
              actions.showProfile(store);
            },
          },
          {
            path: '*',
            redirect: '/',
          },
        ];

        this.rootvue = new Vue({
          name: 'UserRoot',
          el: 'rootvue',
          render: createElement => createElement(RootVue),
          router: router.init(routes),
        });
      });
  }
}

const userModule = new UserModule();

export { userModule as default };
