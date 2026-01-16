import store from 'kolibri/store';
import { PageNames } from '../constants';

import CoursesRootPage from '../views/courses/CoursesRootPage.vue';
import { classIdParamRequiredGuard, RouteSegments } from './utils';

const { OPTIONAL_CLASS, ALL_COURSES } = RouteSegments;

export default [
  {
    name: PageNames.COURSES_ROOT,
    path: OPTIONAL_CLASS + ALL_COURSES,
    component: CoursesRootPage,
    handler(toRoute, fromRoute, next) {
      if (classIdParamRequiredGuard(toRoute, PageNames.COURSES_ROOT, next)) {
        return;
      }
      store.dispatch('notLoading');
    },
    meta: {
      titleParts: ['coursesLabel', 'CLASS_NAME'],
    },
  },
];
