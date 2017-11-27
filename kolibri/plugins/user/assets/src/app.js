import KolibriApp from 'kolibri_app';

import RootVue from './views';
import * as actions from './state/actions';
import { initialState, mutations } from './state/store';
import { PageNames } from './constants';
import store from 'kolibri.coreVue.vuex.store';
import { getFacilityConfig } from 'kolibri.coreVue.vuex.actions';

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

class UserModule extends KolibriApp {
  get stateSetters() {
    return [getFacilityConfig];
  }
  get routes() {
    return routes;
  }
  get RootVue() {
    return RootVue;
  }
  get initialState() {
    return initialState;
  }
  get mutations() {
    return mutations;
  }
}

const userModule = new UserModule();

export { userModule as default };
