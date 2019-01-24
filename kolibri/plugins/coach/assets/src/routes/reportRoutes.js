import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants';
import pages from '../views/reports/allReportsPages';

export default [
  {
    name: PageNames.REPORTS_PAGE,
    path: '/:classId/reports',
    redirect: '/:classId/reports/lessons',
  },
  {
    path: '/:classId/reports/lessons',
    component: pages.ReportsLessonListPage,
    handler() {
      store.dispatch('notLoading');
    },
  },
  {
    path: '/:classId/reports/quizzes',
    component: pages.ReportsQuizListPage,
    handler() {
      store.dispatch('notLoading');
    },
  },
  {
    path: '/:classId/reports/groups',
    component: pages.ReportsGroupListPage,
    handler() {
      store.dispatch('notLoading');
    },
  },
  {
    path: '/:classId/reports/learners',
    component: pages.ReportsLearnerListPage,
    handler() {
      store.dispatch('notLoading');
    },
  },
];
