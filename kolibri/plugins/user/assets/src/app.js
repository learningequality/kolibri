import store from 'kolibri.coreVue.vuex.store';
import { isUserLoggedIn } from 'kolibri.coreVue.vuex.getters';
import router from 'kolibri.coreVue.router';
import RootVue from './views';
import {
  showSignInPage,
  showSignUpPage,
  showProfilePage,
  setFacilitiesAndConfig,
} from './state/actions';
import initialState from './state/initialState';
import mutations from './state/mutations';
import { PageNames } from './constants';
import KolibriApp from 'kolibri_app';

const routes = [
  {
    name: PageNames.ROOT,
    path: '/',
    handler: () => {
      if (isUserLoggedIn(store.state)) {
        router.getInstance().replace({
          name: PageNames.PROFILE,
        });
      } else {
        router.getInstance().replace({
          name: PageNames.SIGN_IN,
        });
      }
    },
  },
  {
    name: PageNames.SIGN_IN,
    path: '/signin',
    handler: () => {
      if (isUserLoggedIn(store.state)) {
        router.getInstance().replace({
          name: PageNames.PROFILE,
        });
      } else {
        showSignInPage(store);
      }
    },
  },
  {
    name: PageNames.SIGN_UP,
    path: '/create_account',
    handler: () => {
      if (isUserLoggedIn(store.state)) {
        router.getInstance().replace({
          name: PageNames.PROFILE,
        });
        return Promise.resolve();
      } else {
        return showSignUpPage(store);
      }
    },
  },
  {
    name: PageNames.PROFILE,
    path: '/profile',
    handler: () => {
      if (!isUserLoggedIn(store.state)) {
        router.getInstance().replace({
          name: PageNames.SIGN_IN,
        });
      } else {
        showProfilePage(store);
      }
    },
  },
  {
    path: '*',
    redirect: '/',
  },
];

class UserModule extends KolibriApp {
  get stateSetters() {
    return [setFacilitiesAndConfig];
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
