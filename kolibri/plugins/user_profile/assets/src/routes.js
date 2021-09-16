import store from 'kolibri.coreVue.vuex.store';
import router from 'kolibri.coreVue.router';
import { ComponentMap } from './constants';
import ProfilePage from './views/ProfilePage';
import ProfileEditPage from './views/ProfileEditPage';

export default [
  {
    path: '/',
    component: ProfilePage,
    beforeEnter(to, from, next) {
      store.commit('CORE_SET_PAGE_LOADING', false);
      if (!store.getters.isUserLoggedIn) {
        next(router.getRoute(ComponentMap.SIGN_IN));
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
        next(router.getRoute(ComponentMap.SIGN_IN));
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
