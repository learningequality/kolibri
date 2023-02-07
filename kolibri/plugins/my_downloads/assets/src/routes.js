import MyDownloadsPage from './views/MyDownloads';

export default [
  {
    path: '/',
    name: 'MY_DOWNLOADS',
    component: MyDownloadsPage,
    // beforeEnter(to, from, next) {
    //   if (!store.getters.isUserLoggedIn) {
    //     redirectBrowser();
    //   } else {
    //     preload(next);
    //   }
    // },
  },
];
