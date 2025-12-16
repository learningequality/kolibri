import store from 'kolibri/store';
import { PageNames } from '../constants';
import LearnersRootPage from '../views/learners/LearnersRootPage';
import LearnerSummaryPage from '../views/learners/LearnerSummaryPage';
import LearnerLessonPage from '../views/learners/reports/LearnerLessonPage.vue';
import { classIdParamRequiredGuard, RouteSegments } from './utils';

const { CLASS, OPTIONAL_CLASS, ALL_LEARNERS, LEARNER, LESSON } = RouteSegments;

function defaultHandler() {
  store.dispatch('notLoading');
}

export default [
  {
    name: PageNames.LEARNERS_ROOT,
    path: OPTIONAL_CLASS + ALL_LEARNERS,
    component: LearnersRootPage,
    handler(toRoute, fromRoute, next) {
      if (classIdParamRequiredGuard(toRoute, PageNames.LEARNERS_ROOT, next)) {
        return;
      }
      defaultHandler();
    },
    meta: {
      titleParts: ['learnersLabel', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.LEARNER_SUMMARY,
    path: CLASS + LEARNER,
    component: LearnerSummaryPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['reportsLabel', 'LEARNER_NAME', 'CLASS_NAME'],
    },
  },
  {
    name: PageNames.LEARNER_LESSON_REPORT,
    path: CLASS + LEARNER + LESSON,
    component: LearnerLessonPage,
    handler: defaultHandler,
    meta: {
      titleParts: ['LESSON_NAME', 'LEARNER_NAME', 'CLASS_NAME'],
    },
  },
];
