import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants';
import ReportsGroupListPage from '../views/reports/ReportsGroupListPage.vue';

const CLASS = '/:classId';
const ALL_GROUPS = '/groups';

function path(...args) {
  return args.join('');
}

export default [
  {
    name: PageNames.GROUPS_ROOT,
    path: path(CLASS, ALL_GROUPS),
    component: ReportsGroupListPage,
    handler: () => {
      store.dispatch('notLoading');
    },
    meta: {
      titleParts: ['learnersLabel', 'CLASS_NAME'],
    },
  },
];
