import KolibriApp from 'kolibri_app';
import RootVue from './views';
import { showRoot, showSignIn, showSignUp, showProfile } from './state/actions';
import initialState from './state/initialState';
import mutations from './state/mutations';
import { PageNames } from './constants';
import store from 'kolibri.coreVue.vuex.store';
import { getFacilityConfig } from 'kolibri.coreVue.vuex.actions';

const routes = [
  {
    name: PageNames.ROOT,
    path: '/',
    handler: () => {
      showRoot(store);
    },
  },
  {
    name: PageNames.SIGN_IN,
    path: '/signin',
    handler: () => {
      showSignIn(store);
    },
  },
  {
    name: PageNames.SIGN_UP,
    path: '/create_account',
    handler: () => {
      showSignUp(store);
    },
  },
  {
    name: PageNames.PROFILE,
    path: '/profile',
    handler: () => {
      showProfile(store);
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

export default new UserModule();
