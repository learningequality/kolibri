import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants/newConstants';

import PlanLessonListPage from '../views/new/PlanLessonListPage';
import PlanQuizListPage from '../views/new/PlanQuizListPage';
import GroupsPage from '../views/GroupsPage';

import { showGroupsPage } from '../modules/groups/handlers';

export default [
  {
    name: PageNames.PLAN_PAGE,
    path: '/:classId/plan',
    redirect: '/:classId/plan/lessons',
  },
  {
    name: PageNames.PlanLessonListPage,
    path: '/:classId/plan/lessons',
    component: PlanLessonListPage,
    handler() {
      store.commit('USE_OLD_INDEX_STYLE', false);
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
  },
  {
    name: PageNames.PlanQuizListPage,
    path: '/:classId/plan/quizzes',
    component: PlanQuizListPage,
    handler() {
      store.commit('USE_OLD_INDEX_STYLE', false);
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
  },
  {
    name: 'GROUPS',
    path: '/:classId/plan/groups',
    component: GroupsPage,
    handler(to) {
      store.commit('USE_OLD_INDEX_STYLE', false);
      showGroupsPage(store, to.params.classId);
    },
  },
];
