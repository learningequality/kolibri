import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants/newConstants';

import ReportsLessonListPage from '../views/reports/ReportsLessonListPage';
import ReportsQuizListPage from '../views/reports/ReportsQuizListPage';
import ReportsGroupListPage from '../views/reports/ReportsGroupListPage';
import ReportsLearnerListPage from '../views/reports/ReportsLearnerListPage';

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
