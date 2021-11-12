import store from 'kolibri.coreVue.vuex.store';
import redirectBrowser from 'kolibri.utils.redirectBrowser';
import ProfilePage from './views/ProfilePage';
import ProfileEditPage from './views/ProfileEditPage';

export default [
  {
    path: '/',
    component: ProfilePage,
    beforeEnter(to, from, next) {
      store.commit('CORE_SET_PAGE_LOADING', false);
      if (!store.getters.isUserLoggedIn) {
        redirectBrowser();
      } else {
        next();
      }
    },
  },
  {
    path: '/edit',
    component: ProfileEditPage,
    beforeEnter(to, from, next) {
      store.commit('CORE_SET_PAGE_LOADING', false);
      if (!store.getters.isUserLoggedIn) {
        redirectBrowser();
      } else {
        next();
      }
    },
  },
  {
    path: '*',
    redirect: '/',
  },
];
