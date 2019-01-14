import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants/newConstants';

import ReportsLessonListPage from '../views/new/ReportsLessonListPage';
import ReportsQuizListPage from '../views/new/ReportsQuizListPage';
import ReportsGroupListPage from '../views/new/ReportsGroupListPage';
import ReportsLearnerListPage from '../views/new/ReportsLearnerListPage';

export default [
  {
    name: PageNames.REPORTS_PAGE,
    path: '/:classId/reports',
    redirect: '/:classId/reports/lessons',
  },
  {
    name: PageNames.ReportsLessonListPage,
    path: '/:classId/reports/lessons',
    component: ReportsLessonListPage,
    handler(to) {
      store.commit('USE_OLD_INDEX_STYLE', false);
      store.commit('SET_CLASS_ID', to.params.classId);
      store.commit('CORE_SET_ERROR', null);
      store.commit('CORE_SET_PAGE_LOADING', true);
      store
        .dispatch('classSummary/loadClassSummary', to.params.classId)
        .then(
          () => store.commit('CORE_SET_PAGE_LOADING', false),
          error => store.dispatch('handleApiError', error)
        );
    },
  },
  {
    name: PageNames.ReportsQuizListPage,
    path: '/:classId/reports/quizzes',
    component: ReportsQuizListPage,
    handler(to) {
      store.commit('USE_OLD_INDEX_STYLE', false);
      store.commit('SET_CLASS_ID', to.params.classId);
      store.commit('CORE_SET_ERROR', null);
      store.commit('CORE_SET_PAGE_LOADING', true);
      store
        .dispatch('classSummary/loadClassSummary', to.params.classId)
        .then(
          () => store.commit('CORE_SET_PAGE_LOADING', false),
          error => store.dispatch('handleApiError', error)
        );
    },
  },
  {
    name: PageNames.ReportsGroupListPage,
    path: '/:classId/reports/groups',
    component: ReportsGroupListPage,
    handler(to) {
      store.commit('USE_OLD_INDEX_STYLE', false);
      store.commit('SET_CLASS_ID', to.params.classId);
      store.commit('CORE_SET_ERROR', null);
      store.commit('CORE_SET_PAGE_LOADING', true);
      store
        .dispatch('classSummary/loadClassSummary', to.params.classId)
        .then(
          () => store.commit('CORE_SET_PAGE_LOADING', false),
          error => store.dispatch('handleApiError', error)
        );
    },
  },
  {
    name: PageNames.ReportsLearnerListPage,
    path: '/:classId/reports/learners',
    component: ReportsLearnerListPage,
    handler(to) {
      store.commit('USE_OLD_INDEX_STYLE', false);
      store.commit('SET_CLASS_ID', to.params.classId);
      store.commit('CORE_SET_ERROR', null);
      store.commit('CORE_SET_PAGE_LOADING', true);
      store
        .dispatch('classSummary/loadClassSummary', to.params.classId)
        .then(
          () => store.commit('CORE_SET_PAGE_LOADING', false),
          error => store.dispatch('handleApiError', error)
        );
    },
  },
];
