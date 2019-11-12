import store from 'kolibri.coreVue.vuex.store';
import router from 'kolibri.coreVue.router';
import { showSignInPage } from './modules/signIn/handlers';
import { showSignUpPage } from './modules/signUp/handlers';
import { showProfilePage } from './modules/profile/handlers';
import { PageNames } from './constants';

export default [
  {
    name: PageNames.ROOT,
    path: '/',
    handler: () => {
      if (store.getters.isUserLoggedIn) {
        router.replace({ name: PageNames.PROFILE });
      } else {
        router.replace({ name: PageNames.SIGN_IN });
      }
    },
  },
  {
    name: PageNames.SIGN_IN,
    path: '/signin',
    handler: () => {
      if (store.getters.isUserLoggedIn) {
        router.replace({ name: PageNames.PROFILE });
      } else {
        showSignInPage(store);
      }
    },
  },
  {
    name: PageNames.SIGN_UP,
    path: '/create_account',
    handler: (toRoute, fromRoute) => {
      if (store.getters.isUserLoggedIn) {
        router.replace({ name: PageNames.PROFILE });
        return Promise.resolve();
      } else {
        return showSignUpPage(store, fromRoute);
      }
    },
  },
  {
    name: PageNames.PROFILE,
    path: '/profile',
    handler: () => {
      if (!store.getters.isUserLoggedIn) {
        router.replace({ name: PageNames.SIGN_IN });
      } else {
        showProfilePage(store);
      }
    },
  },
  {
    name: PageNames.PROFILE_EDIT,
    path: '/profile/edit',
    handler: () => {
      if (!store.getters.isUserLoggedIn) {
        router.replace({ name: PageNames.SIGN_IN });
      } else {
        store.dispatch('resetAndSetPageName', { pageName: PageNames.PROFILE_EDIT });
      }
    },
  },
  {
    path: '*',
    redirect: '/',
  },
];
