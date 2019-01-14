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
    handler() {
      store.commit('USE_OLD_INDEX_STYLE', false);
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
  },
  {
    name: PageNames.ReportsQuizListPage,
    path: '/:classId/reports/quizzes',
    component: ReportsQuizListPage,
    handler() {
      store.commit('USE_OLD_INDEX_STYLE', false);
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
  },
  {
    name: PageNames.ReportsGroupListPage,
    path: '/:classId/reports/groups',
    component: ReportsGroupListPage,
    handler() {
      store.commit('USE_OLD_INDEX_STYLE', false);
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
  },
  {
    name: PageNames.ReportsLearnerListPage,
    path: '/:classId/reports/learners',
    component: ReportsLearnerListPage,
    handler() {
      store.commit('USE_OLD_INDEX_STYLE', false);
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
  },
];
