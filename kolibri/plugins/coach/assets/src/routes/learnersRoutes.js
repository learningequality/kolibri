import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants';
import LearnersRootPage from '../views/learners/LearnersRootPage';
import LearnerSummaryPage from '../views/learners/LearnerSummaryPage';
import ReportsLearnerActivityPage from '../views/learners/LearnerSummaryPage/ReportsLearnerActivityPage.vue';

const CLASS = '/:classId';
const ALL_LEARNERS = '/learners';
const LEARNER = '/learners/:learnerId';

function path(...args) {
  return args.join('');
}

function defaultHandler() {
  store.dispatch('notLoading');
}

export default [
  {
    name: PageNames.LEARNERS_ROOT,
    path: path(CLASS, ALL_LEARNERS),
    component: LearnersRootPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['learnersLabel', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.LEARNER_SUMMARY,
    path: path(CLASS, LEARNER),
    component: LearnerSummaryPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['reportsLabel', 'LEARNER_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: 'ReportsLearnerActivityPage', // Will be removed in #12733
    path: path(CLASS, LEARNER, '/activity'),
    component: ReportsLearnerActivityPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['activityLabel', 'LEARNER_NAME', 'CLASS_NAME'],
    },
  },
];
