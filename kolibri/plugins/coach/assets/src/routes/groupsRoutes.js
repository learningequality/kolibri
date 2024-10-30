import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants';
import { useGroups } from '../composables/useGroups';
import GroupsPage from '../views/plan/GroupsPage';
import GroupEnrollPage from '../views/plan/GroupEnrollPage';
import GroupMembersPage from '../views/plan/GroupMembersPage';

const CLASS = '/:classId';
const ALL_GROUPS = '/groups';
const GROUP = '/groups/:groupId';

function path(...args) {
  return args.join('');
}

const { showGroupsPage } = useGroups();

export default [
  {
    name: PageNames.GROUPS_ROOT,
    path: path(CLASS, ALL_GROUPS),
    component: GroupsPage,
    handler(to) {
      showGroupsPage(store, to.params.classId);
    },
    meta: {
      titleParts: ['groupsLabel', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.GROUP_SUMMARY,
    path: path(CLASS, GROUP),
    component: GroupMembersPage,
    handler(to) {
      showGroupsPage(store, to.params.classId);
    },
    meta: {
      titleParts: ['membersLabel', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.GROUP_ENROLL,
    path: path(CLASS, GROUP, '/enroll'),
    component: GroupEnrollPage,
    handler(to) {
      showGroupsPage(store, to.params.classId);
    },
  },
];
