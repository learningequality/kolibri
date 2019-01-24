import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants';
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
    name: ReportsLessonListPage.name,
    path: '/:classId/reports/lessons',
    component: ReportsLessonListPage,
    handler() {
      store.dispatch('notLoading');
    },
  },
  {
    name: ReportsQuizListPage.name,
    path: '/:classId/reports/quizzes',
    component: ReportsQuizListPage,
    handler() {
      store.dispatch('notLoading');
    },
  },
  {
    name: ReportsGroupListPage.name,
    path: '/:classId/reports/groups',
    component: ReportsGroupListPage,
    handler() {
      store.dispatch('notLoading');
    },
  },
  {
    name: ReportsLearnerListPage.name,
    path: '/:classId/reports/learners',
    component: ReportsLearnerListPage,
    handler() {
      store.dispatch('notLoading');
    },
  },
];
