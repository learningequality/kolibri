import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants/newConstants';

import PlanQuizListPage from '../views/new/PlanQuizListPage';
import GroupsPage from '../views/GroupsPage';

import { showGroupsPage } from '../modules/groups/handlers';

import lessonsRoutes from './lessonsRoutes';

export default [
  ...lessonsRoutes,
  {
    name: PageNames.PLAN_PAGE,
    path: '/:classId/plan',
    redirect: '/:classId/plan/lessons',
  },
  {
    name: PageNames.PlanQuizListPage,
    path: '/:classId/plan/quizzes',
    component: PlanQuizListPage,
    handler(to) {
      store.commit('USE_OLD_INDEX_STYLE', false);
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('SET_CLASS_ID', to.params.classId);
    },
  },
  {
    name: 'GROUPS',
    path: '/:classId/plan/groups',
    component: GroupsPage,
    handler(to) {
      store.commit('USE_OLD_INDEX_STYLE', false);
      store.commit('SET_CLASS_ID', to.params.classId);
      showGroupsPage(store, to.params.classId);
    },
  },
];
