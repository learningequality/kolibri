import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants/newConstants';
import { showNewPage } from '../modules/coreCoach/handlers';

import CoachClassListPage from '../views/new/CoachClassListPage';

export default [
  {
    name: PageNames.COACH_CLASS_LIST,
    path: '/',
    component: CoachClassListPage,
    handler: () => {
      console.log('A');
      store.commit('USE_OLD_INDEX_STYLE', false);
      store.commit('SET_PAGE_NAME', PageNames.COACH_CLASS_LIST);
      store.commit('CORE_SET_PAGE_LOADING', false);
      // showNewPage(store, 'CoachClassListPage');
    },
  },
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
