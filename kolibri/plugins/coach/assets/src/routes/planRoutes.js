import store from 'kolibri.coreVue.vuex.store';

import { PageNames } from '../constants/newConstants';
import GroupsPage from '../views/GroupsPage';
import CoachExamsPage from '../views/exams/CoachExamsPage';
import { showGroupsPage } from '../modules/groups/handlers';
import { showExamsPage } from '../modules/examsRoot/handlers';
import lessonsRoutes from './lessonsRoutes';

export default [
  ...lessonsRoutes,
  {
    name: PageNames.PLAN_PAGE,
    path: '/:classId/plan',
    redirect: '/:classId/plan/lessons',
  },

  {
    name: 'EXAMS',
    path: '/:classId/plan/quizzes',
    component: CoachExamsPage,
    handler(to) {
      store.commit('SET_CLASS_ID', to.params.classId);
      showExamsPage(store, to.params.classId);
    },
  },
  {
    name: 'GROUPS',
    path: '/:classId/plan/groups',
    component: GroupsPage,
    handler(to) {
      store.commit('SET_CLASS_ID', to.params.classId);
      showGroupsPage(store, to.params.classId);
    },
  },
];
