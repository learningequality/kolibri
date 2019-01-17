import store from 'kolibri.coreVue.vuex.store';
import router from 'kolibri.coreVue.router';
import { PageNames } from '../constants/newConstants';
import { shouldRedirectToClassRootPage } from '../modules/coreCoach/handlers';

import CoachClassListPage from '../views/new/CoachClassListPage';
import HomePage from '../views/new/HomePage';

export default [
  {
    name: PageNames.COACH_CLASS_LIST,
    path: '/',
    component: CoachClassListPage,
    handler() {
      shouldRedirectToClassRootPage().then(classId => {
        if (classId) {
          router.replace({
            name: PageNames.HOME_PAGE,
            params: { classId },
          });
          return;
        }
        store.commit('CORE_SET_PAGE_LOADING', true);
        store.commit('SET_PAGE_NAME', PageNames.CLASS_LIST);
        store.dispatch('setClassState').then(
          () => {
            store.commit('CORE_SET_PAGE_LOADING', false);
            store.commit('CORE_SET_ERROR', null);
          },
          error => store.dispatch('handleApiError', error)
        );
      });
    },
  },
  {
    name: PageNames.HOME_PAGE,
    path: '/:classId/home',
    component: HomePage,
    handler(to) {
      store.commit('SET_CLASS_ID', to.params.classId);
      store.commit('CORE_SET_PAGE_LOADING', true);
      store.commit('SET_PAGE_NAME', PageNames.HOME_PAGE);
      store.dispatch('classSummary/loadClassSummary', to.params.classId).then(
        () => {
          store.commit('CORE_SET_PAGE_LOADING', false);
          store.commit('CORE_SET_ERROR', null);
        },
        error => store.dispatch('handleApiError', error)
      );
    },
  },
  /* COACH - under construction ... */
  {
    name: PageNames.NEW_COACH_PAGES,
    path: '/:page',
    handler(to) {
      store.commit('SET_CLASS_ID', to.params.classId);
      store.commit('SET_PAGE_NAME', PageNames.NEW_COACH_PAGES);
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('SET_CLASS_INFO', {
        classId: '1',
        currentClassroom: null,
        classList: [],
      });
    },
  },
  /* ... COACH - under construction */
  {
    path: '*',
    redirect: '/',
  },
];
