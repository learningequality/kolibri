import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants';
import GroupsPage from '../views/plan/GroupsPage';
import GroupMembersPage from '../views/plan/GroupMembersPage';
import GroupEnrollPage from '../views/plan/GroupEnrollPage';
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
    name: GroupsPage.name,
    path: '/:classId/plan/groups',
    component: GroupsPage,
    handler(to) {
      showGroupsPage(store, to.params.classId);
    },
    meta: {
      titleParts: ['groupsLabel', 'CLASS_NAME'],
    },
  },
  {
    name: GroupMembersPage.name,
    path: '/:classId/plan/groups/:groupId',
    component: GroupMembersPage,
    handler(to) {
      showGroupsPage(store, to.params.classId);
    },
    meta: {
      titleParts: ['membersLabel', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: GroupEnrollPage.name,
    path: '/:classId/plan/groups/:groupId/enroll',
    component: GroupEnrollPage,
    handler(to) {
      showGroupsPage(store, to.params.classId);
    },
  },
];
