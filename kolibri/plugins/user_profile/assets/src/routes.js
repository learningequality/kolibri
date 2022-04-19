import store from 'kolibri.coreVue.vuex.store';
import redirectBrowser from 'kolibri.utils.redirectBrowser';
import ProfilePage from './views/ProfilePage';
import ProfileEditPage from './views/ProfileEditPage';

function preload(next) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.dispatch('getFacilityConfig').then(() => {
    store.commit('CORE_SET_PAGE_LOADING', false);
    next();
  });
}

export default [
  {
    path: '/',
    component: ProfilePage,
    beforeEnter(to, from, next) {
      if (!store.getters.isUserLoggedIn) {
        redirectBrowser();
      } else {
        preload(next);
      }
    },
  },
  {
    path: '/edit',
    component: ProfileEditPage,
    beforeEnter(to, from, next) {
      if (!store.getters.isUserLoggedIn) {
        redirectBrowser();
      } else {
        preload(next);
      }
    },
  },
  {
    path: '*',
    redirect: '/',
  },
];
