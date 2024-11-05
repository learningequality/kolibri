import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants';
import { useGroups } from '../composables/useGroups';
import GroupsRootPage from '../views/groups/GroupsRootPage';
import GroupEnrollPage from '../views/groups/GroupEnrollPage';
import GroupMembersPage from '../views/groups/GroupMembersPage';
import LessonLearnerPage from '../views/lessons/reports/LessonLearnerPage.vue';

const CLASS = '/:classId';
const ALL_GROUPS = '/groups';
const GROUP = '/groups/:groupId';
const LESSON = '/lessons/:lessonId';
const LEARNER = '/learners/:learnerId';

function path(...args) {
  return args.join('');
}

const { showGroupsPage } = useGroups();

function defaultHandler() {
  store.dispatch('notLoading');
}

export default [
  {
    name: PageNames.GROUPS_ROOT,
    path: path(CLASS, ALL_GROUPS),
    component: GroupsRootPage,
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
  {
    name: PageNames.GROUP_LESSON_LEARNER,
    path: path(CLASS, GROUP, LESSON, LEARNER),
    component: LessonLearnerPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['learnersLabel', 'LESSON_NAME', 'GROUP_NAME', 'CLASS_NAME'],
    },
  },
];
