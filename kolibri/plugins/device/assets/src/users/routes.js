import store from 'kolibri.coreVue.vuex.store';
import redirectBrowser from 'kolibri.utils.redirectBrowser';
import UsersPage from './views/UsersPage.vue';

export default [
  {
    path: '/',
    name: 'USERS',
    component: UsersPage,
    beforeEnter(to, from, next) {
      if (!store.getters.isUserLoggedIn) {
        redirectBrowser();
      } else {
        next();
      }
    },
  },
];
