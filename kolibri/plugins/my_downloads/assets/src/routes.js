import store from 'kolibri.coreVue.vuex.store';
import redirectBrowser from 'kolibri.utils.redirectBrowser';
import MyDownloadsPage from './views/MyDownloads';

export default [
  {
    path: '/',
    name: 'MY_DOWNLOADS',
    component: MyDownloadsPage,
    beforeEnter(to, from, next) {
      if (!store.getters.isUserLoggedIn) {
        redirectBrowser();
      } else {
        next();
      }
    },
  },
];
