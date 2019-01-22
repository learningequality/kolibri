import store from 'kolibri.coreVue.vuex.store';
import router from 'kolibri.coreVue.router';
import { ClassroomResource } from 'kolibri.resources';
import { PageNames } from '../constants';
import CoachClassListPage from '../views/CoachClassListPage';
import HomePage from '../views/home/HomePage';
import reportRoutes from './reportRoutes';
import planRoutes from './planRoutes';

export default [
  ...planRoutes,
  ...reportRoutes,
  {
    name: PageNames.COACH_CLASS_LIST,
    path: '/',
    component: CoachClassListPage,
    handler() {
      const classroomsPromise = ClassroomResource.fetchCollection({
        getParams: { role: 'coach' },
        force: true,
      });
      classroomsPromise.then(classrooms => {
        if (classrooms.length === 1) {
          router.replace({
            name: PageNames.HOME_PAGE,
            params: { classId: classrooms[0].id },
          });
          return;
        }
        store.commit('CORE_SET_PAGE_LOADING', true);
        store.commit('SET_PAGE_NAME', PageNames.CLASS_LIST);
        store.dispatch('setClassList').then(
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
      store.commit('SET_CLASS_LIST', []);
    },
  },
  /* ... COACH - under construction */
  {
    path: '*',
    redirect: '/',
  },
];
