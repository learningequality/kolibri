import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants';
import LearnersRootPage from '../views/learners/LearnersRootPage';

const CLASS = '/:classId';
const ALL_LEARNERS = '/learners';

function path(...args) {
  return args.join('');
}

export default [
  {
    name: PageNames.LEARNERS_ROOT,
    path: path(CLASS, ALL_LEARNERS),
    component: LearnersRootPage,
    handler: () => {
      store.dispatch('notLoading');
    },
    meta: {
      titleParts: ['learnersLabel', 'CLASS_NAME'],
    },
  },
];
