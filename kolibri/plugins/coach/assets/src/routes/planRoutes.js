import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants';

import GroupsPage from '../views/plan/GroupsPage';
import { showGroupsPage } from '../modules/groups/handlers';
import planLessonsRoutes from './planLessonsRoutes';
import planExamRoutes from './planExamRoutes';

export default [
  ...planLessonsRoutes,
  ...planExamRoutes,
  {
    name: PageNames.PLAN_PAGE,
    path: '/:classId/plan',
    redirect: '/:classId/plan/lessons',
  },
  {
    name: PageNames.PLAN_GROUPS_PAGE,
    path: '/:classId/plan/groups',
    component: GroupsPage,
    handler(to) {
      store.commit('SET_CLASS_ID', to.params.classId);
      showGroupsPage(store, to.params.classId);
    },
  },
];
