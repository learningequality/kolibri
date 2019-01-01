import store from 'kolibri.coreVue.vuex.store';
import router from 'kolibri.coreVue.router';
import { PageNames } from '../constants/newConstants';
import { showClassListPage, showHomePage, showNewPage } from '../modules/coreCoach/newHandlers';
import { shouldRedirectToClassRootPage } from '../modules/coreCoach/handlers';

import CoachClassListPage from '../views/new/CoachClassListPage';
import HomePage from '../views/new/HomePage';

export default [
  {
    name: PageNames.COACH_CLASS_LIST,
    path: '/',
    component: CoachClassListPage,
    handler: () => {
      store.commit('USE_OLD_INDEX_STYLE', false);
      shouldRedirectToClassRootPage().then(classId => {
        if (classId) {
          return router.replace({
            name: PageNames.HOME_PAGE,
            params: { classId },
          });
        }
        return showClassListPage(store);
      });
    },
  },
  {
    name: PageNames.HOME_PAGE,
    path: '/:classId/home',
    component: HomePage,
    handler: to => {
      store.commit('USE_OLD_INDEX_STYLE', false);
      showHomePage(store, to.params.classId);
    },
  },
  // {
  //   name: 'next',
  //   path: '/url',
  //   component: Component,
  //   handler: () => {
  //     store.commit('USE_OLD_INDEX_STYLE', false);
  //     store.commit('CORE_SET_PAGE_LOADING', false);
  //   },
  // },
  /* COACH - under construction ... */
  {
    name: PageNames.NEW_COACH_PAGES,
    path: '/:page',
    handler: to => {
      store.commit('USE_OLD_INDEX_STYLE', true);
      showNewPage(store, to.params.page);
    },
  },
  /* ... COACH - under construction */
  {
    path: '*',
    redirect: '/',
  },
];
